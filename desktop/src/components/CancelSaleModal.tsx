// desktop/src/components/CancelSaleModal.tsx
import { useState, useEffect } from 'react'
import supabase from '../lib/supabaseClient'
import { logAction } from '../lib/auditLogger'
import { useAuthStore } from '../store/authStore'
import type { Sale } from '../types/database'

const formatMXN = (amount: number) =>
  amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

interface SaleWithCount extends Sale {
  item_count: number
}

interface CancelSaleModalProps {
  onClose: () => void
}

export default function CancelSaleModal({ onClose }: CancelSaleModalProps) {
  const [sales, setSales] = useState<SaleWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const profile = useAuthStore((s) => s.profile)

  useEffect(() => {
    const fetchSales = async () => {
      if (!profile) return

      const now = new Date()
      const mexicoOffset = now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
      const mexicoMidnight = new Date(mexicoOffset)
      mexicoMidnight.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('sales')
        .select('*, sale_items(count)')
        .eq('cashier_id', profile.id)
        .eq('status', 'completed')
        .gte('created_at', mexicoMidnight.toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      const salesWithCount = (data ?? []).map((s) => ({
        ...s,
        item_count: (s.sale_items as unknown as { count: number }[])?.[0]?.count ?? 0,
      }))
      setSales(salesWithCount)
      setLoading(false)
    }

    fetchSales()
  }, [profile])

  const handleCancel = async (sale: Sale) => {
    setCancelling(sale.id)

    const { error } = await supabase
      .from('sales')
      .update({ status: 'cancelled' as const })
      .eq('id', sale.id)

    if (error) {
      alert('Error al cancelar: ' + error.message)
      setCancelling(null)
      return
    }

    await logAction('SALE_CANCELLED', 'sale', sale.id, {
      total: sale.total,
      status: sale.status,
      payment_method: sale.payment_method,
      amount_paid: sale.amount_paid,
    }, {
      status: 'cancelled',
    })

    setSales((prev: SaleWithCount[]) => prev.filter((s) => s.id !== sale.id))
    setConfirmId(null)
    setCancelling(null)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-cream rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold text-coffee-900 mb-4">Cancelar Venta Pasada</h2>

        {loading ? (
          <div className="text-center py-8 text-coffee-300">Cargando ventas...</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-coffee-300">
            No hay ventas completadas hoy
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-coffee-200"
              >
                <div>
                  <div className="text-sm font-medium text-coffee-900">
                    {formatMXN(sale.total)}
                  </div>
                  <div className="text-xs text-coffee-300">
                    {formatTime(sale.created_at)} · {sale.item_count} {sale.item_count === 1 ? 'producto' : 'productos'}
                  </div>
                </div>

                {confirmId === sale.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">¿Segura?</span>
                    <button
                      onClick={() => handleCancel(sale)}
                      disabled={cancelling === sale.id}
                      className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelling === sale.id ? '...' : 'Sí, cancelar'}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-2 py-1 rounded text-xs text-coffee-500 hover:bg-coffee-100"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(sale.id)}
                    className="px-3 py-1.5 rounded-lg text-xs text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-red-400 mt-3 text-center">
          Las cancelaciones quedan registradas en auditoría
        </p>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 rounded-lg border border-coffee-200 text-coffee-700 text-sm hover:bg-coffee-100 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
