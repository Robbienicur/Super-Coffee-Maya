import { useState } from 'react'
import supabase from '../../lib/supabaseClient'
import { logAction } from '../../lib/auditLogger'
import type { Product } from '../../types/database'

interface DeleteProductModalProps {
  product: Product
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteProductModal({ product, onClose, onDeleted }: DeleteProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setError(null)
    setLoading(true)

    const { error: updateError } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', product.id)

    if (updateError) {
      setError('Error al desactivar el producto: ' + updateError.message)
      setLoading(false)
      return
    }

    await logAction(
      'PRODUCT_DEACTIVATED',
      'product',
      product.id,
      { is_active: true, name: product.name },
      { is_active: false }
    )

    setLoading(false)
    onDeleted()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-cream rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-bold text-coffee-900 mb-3">Desactivar producto</h2>

        <p className="text-sm text-coffee-700 mb-6">
          ¿Seguro que quieres desactivar <span className="font-bold">{product.name}</span>? El
          producto no aparecerá en el punto de venta pero se conservará en el historial.
        </p>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-coffee-200 text-coffee-700 text-sm hover:bg-coffee-100 disabled:opacity-50 transition-colors"
          >
            No, conservar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Desactivando...' : 'Sí, desactivar'}
          </button>
        </div>
      </div>
    </div>
  )
}
