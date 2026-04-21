import { useState } from 'react'
import supabase from '../../lib/supabaseClient'
import { logAction } from '../../lib/auditLogger'
import type { Sale } from '../../types/database'
import { formatMXN } from '../../utils/formatMXN'

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

interface CancelSaleModalProps {
  sale: Sale & { cashier_name?: string; cashier_email?: string }
  onClose: () => void
  onCancelled: () => void
}

export default function CancelSaleModal({ sale, onClose, onCancelled }: CancelSaleModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const cashierLabel = sale.cashier_name || sale.cashier_email || '—'

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('El motivo es obligatorio.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('sales')
      .update({ status: 'cancelled' as const, notes: reason.trim() })
      .eq('id', sale.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await logAction(
      'SALE_CANCELLED',
      'sale',
      sale.id,
      { status: 'completed', total: sale.total },
      { status: 'cancelled', reason: reason.trim() }
    )

    onCancelled()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-[fade-in_200ms_ease-out]">
      <div className="bg-cream rounded-xl p-6 w-full max-w-sm shadow-xl animate-[scale-in_200ms_ease-out]">
        <h2 className="text-lg font-bold text-coffee-900 mb-4">Cancelar Venta</h2>

        {/* Resumen de venta */}
        <div className="bg-white rounded-lg border border-coffee-200 p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-coffee-500">Total</span>
            <span className="font-semibold text-coffee-900">{formatMXN(sale.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-coffee-500">Fecha</span>
            <span className="text-coffee-700">{formatDateTime(sale.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-coffee-500">Cajero</span>
            <span className="text-coffee-700">{cashierLabel}</span>
          </div>
        </div>

        {/* Motivo */}
        <div className="mb-3">
          <label className="block text-sm text-coffee-700 mb-1">
            Motivo de cancelación <span className="text-red-500">*</span>
          </label>
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError(null)
            }}
            className="w-full px-3 py-2 rounded-lg bg-white border-2 border-coffee-200 text-sm text-coffee-900 outline-none focus:border-coffee-500 resize-none"
            placeholder="Describe el motivo..."
          />
        </div>

        {/* Advertencia */}
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Las existencias de los productos se revertirán automáticamente.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg border border-coffee-200 text-coffee-700 text-sm hover:bg-coffee-100 disabled:opacity-40 transition-colors"
          >
            No, conservar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Cancelando...' : 'Confirmar Cancelación'}
          </button>
        </div>
      </div>
    </div>
  )
}
