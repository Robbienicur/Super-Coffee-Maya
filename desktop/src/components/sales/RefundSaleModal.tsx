import { useState } from 'react'
import supabase from '../../lib/supabaseClient'
import { logAction } from '../../lib/auditLogger'
import type { Sale } from '../../types/database'

const formatMXN = (amount: number) =>
  amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })

interface RefundSaleModalProps {
  sale: Sale & { cashier_name?: string; cashier_email?: string }
  onClose: () => void
  onRefunded: () => void
}

export default function RefundSaleModal({ sale, onClose, onRefunded }: RefundSaleModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('El motivo es obligatorio.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('sales')
      .update({ status: 'refunded' as const, notes: reason.trim() })
      .eq('id', sale.id)

    if (updateError) {
      setError('Error al procesar el reembolso: ' + updateError.message)
      setLoading(false)
      return
    }

    await logAction(
      'SALE_REFUNDED',
      'sale',
      sale.id,
      { status: 'completed', total: sale.total },
      { status: 'refunded', reason: reason.trim() }
    )

    onRefunded()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-[fade-in_200ms_ease-out]">
      <div className="bg-cream rounded-xl p-6 w-full max-w-sm shadow-xl animate-[scale-in_200ms_ease-out]">
        <h2 className="text-lg font-bold text-coffee-900 mb-4">Reembolsar Venta</h2>

        {/* Resumen de venta */}
        <div className="bg-white rounded-lg border border-coffee-200 p-4 mb-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-coffee-500">Total a reembolsar</span>
            <span className="text-base font-bold text-coffee-900">{formatMXN(sale.total)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-coffee-500">Fecha</span>
            <span className="text-sm text-coffee-700">{formatDate(sale.created_at)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-coffee-500">Cajero</span>
            <span className="text-sm text-coffee-700">
              {sale.cashier_name ?? sale.cashier_email ?? '—'}
            </span>
          </div>
        </div>

        {/* Motivo obligatorio */}
        <label className="block mb-1 text-sm font-medium text-coffee-800">
          Motivo del reembolso
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej. Cliente devolvió producto dañado"
          rows={3}
          className="w-full rounded-lg border border-coffee-300 px-3 py-2 text-sm text-coffee-900 placeholder-coffee-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none mb-3"
        />

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        {/* Advertencia */}
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
          <span className="text-yellow-500 text-base leading-tight mt-0.5">⚠</span>
          <p className="text-xs text-yellow-700">
            Las existencias de los productos se revertirán automáticamente.
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-coffee-300 text-coffee-700 text-sm hover:bg-coffee-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar Reembolso'}
          </button>
        </div>
      </div>
    </div>
  )
}
