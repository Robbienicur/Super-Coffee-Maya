import { useState, useEffect, useCallback, useMemo } from 'react'
import supabase from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import SalesFilters, { type SalesFilterValues } from '../components/sales/SalesFilters'
import SalesTable, { type SaleWithCashier } from '../components/sales/SalesTable'
import CancelSaleModal from '../components/sales/CancelSaleModal'
import RefundSaleModal from '../components/sales/RefundSaleModal'
import { getMexicoDayStart, getMexicoDayEnd } from '../utils/mexicoTime'

function todayRange(): { start: string; end: string } {
  return { start: getMexicoDayStart(), end: getMexicoDayEnd() }
}

const DEFAULT_FILTERS: SalesFilterValues = {
  dateRange: todayRange(),
  cashierId: '',
  paymentMethod: '',
  status: '',
}

import { formatMXN } from '../utils/formatMXN'

export default function Sales() {
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'

  const [sales, setSales] = useState<SaleWithCashier[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SalesFilterValues>(DEFAULT_FILTERS)
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null)
  const [cancelSale, setCancelSale] = useState<SaleWithCashier | null>(null)
  const [refundSale, setRefundSale] = useState<SaleWithCashier | null>(null)
  const [toast, setToast] = useState<{ message: string; phase: 'entering' | 'visible' | 'exiting' } | null>(null)

  const showToast = useCallback((message: string) => {
    setToast({ message, phase: 'entering' })
    requestAnimationFrame(() => setToast((t) => t ? { ...t, phase: 'visible' } : null))
    setTimeout(() => {
      setToast((t) => t ? { ...t, phase: 'exiting' } : null)
      setTimeout(() => setToast(null), 200)
    }, 3500)
  }, [])

  const fetchSales = useCallback(async () => {
    if (!profile) return

    let query = supabase
      .from('sales')
      .select('*, profiles(name, email)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!isAdmin) {
      query = query.eq('cashier_id', profile.id)
    }

    const { start, end } = filters.dateRange
    if (start) query = query.gte('created_at', start)
    if (end) query = query.lte('created_at', end)
    if (filters.cashierId) query = query.eq('cashier_id', filters.cashierId)
    if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod)
    if (filters.status) query = query.eq('status', filters.status)

    const { data } = await query

    const mapped: SaleWithCashier[] = (data ?? []).map((s) => {
      const prof = (s.profiles as unknown as { name: string; email: string } | null)
      return {
        ...s,
        profiles: undefined,
        cashier_name: prof?.name ?? '',
        cashier_email: prof?.email ?? '',
      }
    })

    setSales(mapped)
    setLoading(false)
  }, [profile, isAdmin, filters])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('sales-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSales()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchSales])

  const handleToggleExpand = useCallback((saleId: string) => {
    setExpandedSaleId((prev) => (prev === saleId ? null : saleId))
  }, [])

  const handleCancelled = useCallback(() => {
    setCancelSale(null)
    fetchSales()
    showToast('Venta cancelada correctamente')
  }, [fetchSales, showToast])

  const handleRefunded = useCallback(() => {
    setRefundSale(null)
    fetchSales()
    showToast('Venta reembolsada correctamente')
  }, [fetchSales, showToast])

  const completedTotal = useMemo(
    () => sales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.total, 0),
    [sales]
  )

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-36 bg-coffee-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex-1 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-coffee-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Filters */}
      <SalesFilters filters={filters} onChange={setFilters} isAdmin={isAdmin ?? false} />

      {/* Summary */}
      <p className="text-xs text-coffee-400">
        {sales.length} venta{sales.length !== 1 ? 's' : ''} —{' '}
        Total completadas: {formatMXN(completedTotal)}
      </p>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <SalesTable
          sales={sales}
          isAdmin={isAdmin ?? false}
          currentUserId={profile?.id ?? ''}
          expandedSaleId={expandedSaleId}
          onToggleExpand={handleToggleExpand}
          onCancel={setCancelSale}
          onRefund={setRefundSale}
        />
      </div>

      {/* Modals */}
      {cancelSale !== null && (
        <CancelSaleModal
          sale={cancelSale}
          onClose={() => setCancelSale(null)}
          onCancelled={handleCancelled}
        />
      )}

      {refundSale !== null && (
        <RefundSaleModal
          sale={refundSale}
          onClose={() => setRefundSale(null)}
          onRefunded={handleRefunded}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 px-5 py-3 rounded-lg shadow-2xl text-sm font-medium z-50 bg-success text-white ${
          toast.phase === 'exiting' ? 'toast-exit' : 'toast-enter'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
