import { useState } from 'react'
import supabase from '../../lib/supabaseClient'
import { logAction } from '../../lib/auditLogger'
import { useAuthStore } from '../../store/authStore'
import type { Product } from '../../types/database'

const REASONS = [
  'Llegó pedido de proveedor',
  'Producto dañado',
  'Conteo físico',
  'Otro',
] as const

interface StockAdjustModalProps {
  product: Product
  onClose: () => void
  onSaved: () => void
}

export default function StockAdjustModal({ product, onClose, onSaved }: StockAdjustModalProps) {
  const [newStock, setNewStock] = useState<string>(String(product.stock))
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const profile = useAuthStore((s) => s.profile)

  const parsedStock = parseInt(newStock, 10)
  const validStock = !isNaN(parsedStock) && parsedStock >= 0
  const diff = validStock ? parsedStock - product.stock : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validStock) {
      setError('El stock debe ser un número mayor o igual a 0.')
      return
    }
    if (!reason) {
      setError('Selecciona un motivo.')
      return
    }
    if (reason === 'Otro' && !customReason.trim()) {
      setError('Escribe el motivo personalizado.')
      return
    }
    if (!profile) {
      setError('Sesión expirada.')
      return
    }

    const finalReason = reason === 'Otro' ? customReason.trim() : reason

    setLoading(true)

    const { error: insertError } = await supabase.from('stock_adjustments').insert({
      product_id: product.id,
      user_id: profile.id,
      previous_stock: product.stock,
      new_stock: parsedStock,
      reason: finalReason,
    })

    if (insertError) {
      setError('Error al registrar ajuste: ' + insertError.message)
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: parsedStock })
      .eq('id', product.id)

    if (updateError) {
      setError('Error al actualizar stock: ' + updateError.message)
      setLoading(false)
      return
    }

    await logAction(
      'STOCK_ADJUSTED',
      'product',
      product.id,
      { stock: product.stock },
      { stock: parsedStock, reason: finalReason }
    )

    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-cream rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-bold text-coffee-900 mb-1">Ajustar Stock</h2>
        <p className="text-sm text-coffee-500 mb-5">{product.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stock actual (solo lectura) */}
          <div>
            <label className="block text-xs font-medium text-coffee-700 mb-1">
              Stock actual
            </label>
            <div className="px-3 py-2 bg-coffee-50 border border-coffee-200 rounded-lg text-coffee-900 text-sm">
              {product.stock}
            </div>
          </div>

          {/* Nuevo stock */}
          <div>
            <label className="block text-xs font-medium text-coffee-700 mb-1">
              Nuevo stock
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="flex-1 px-3 py-2 border border-coffee-300 rounded-lg text-coffee-900 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500 bg-white"
              />
              {diff !== null && diff !== 0 && (
                <span
                  className={`text-sm font-semibold min-w-[3rem] text-right ${
                    diff > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {diff > 0 ? `+${diff}` : diff}
                </span>
              )}
              {diff === 0 && (
                <span className="text-sm text-coffee-400 min-w-[3rem] text-right">±0</span>
              )}
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-coffee-700 mb-1">
              Motivo
            </label>
            <select
              value={reason}
              onChange={(e) => { setReason(e.target.value); setCustomReason('') }}
              className="w-full px-3 py-2 border border-coffee-300 rounded-lg text-coffee-900 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500 bg-white"
            >
              <option value="">Selecciona un motivo...</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Motivo personalizado */}
          {reason === 'Otro' && (
            <div>
              <label className="block text-xs font-medium text-coffee-700 mb-1">
                Especifica el motivo
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Ej. Merma por caducidad"
                className="w-full px-3 py-2 border border-coffee-300 rounded-lg text-coffee-900 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500 bg-white"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-coffee-200 text-coffee-700 text-sm hover:bg-coffee-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-coffee-800 text-white text-sm font-medium hover:bg-coffee-900 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
