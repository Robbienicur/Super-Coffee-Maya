// desktop/src/components/CheckoutModal.tsx
import { useState } from 'react'
import type { CartItem } from '../store/cartStore'
import supabase from '../lib/supabaseClient'
import { logAction } from '../lib/auditLogger'
import { useAuthStore } from '../store/authStore'

interface CheckoutModalProps {
  items: CartItem[]
  total: number
  onClose: () => void
  onComplete: (changeGiven: number) => void
}

export default function CheckoutModal({ items, total, onClose, onComplete }: CheckoutModalProps) {
  const [amountReceived, setAmountReceived] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const profile = useAuthStore((s) => s.profile)

  const amount = parseFloat(amountReceived) || 0
  const change = amount - total
  const canConfirm = amount >= total && !loading

  const handleConfirm = async () => {
    if (!canConfirm || !profile) return
    setLoading(true)
    setError(null)

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        cashier_id: profile.id,
        total,
        discount_amount: 0,
        payment_method: 'cash' as const,
        amount_paid: amount,
        change_given: change,
        status: 'completed' as const,
        notes: '',
      })
      .select('id')
      .single()

    if (saleError || !sale) {
      setError(saleError?.message ?? 'Error al crear la venta')
      setLoading(false)
      return
    }

    const saleItems = items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
      subtotal: item.product.price * item.quantity,
    }))

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems)

    if (itemsError) {
      setError('Error al registrar los productos: ' + itemsError.message)
      setLoading(false)
      return
    }

    await logAction('SALE_COMPLETED', 'sale', sale.id, undefined, {
      total,
      items_count: items.length,
      payment_method: 'cash',
      amount_paid: amount,
      change_given: change,
    })

    onComplete(change)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-cream rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-bold text-coffee-900 mb-4">Cobrar Venta</h2>

        <div className="text-center mb-4">
          <div className="text-sm text-coffee-300">Total a cobrar</div>
          <div className="text-3xl font-bold text-coffee-900">${total.toFixed(2)}</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-coffee-700 mb-1">Monto recibido</label>
          <input
            type="number"
            autoFocus
            step="0.01"
            min="0"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canConfirm) handleConfirm()
            }}
            className="w-full px-4 py-3 rounded-lg bg-white border-2 border-coffee-200 text-xl text-center text-coffee-900 outline-none focus:border-coffee-500"
            placeholder="$0.00"
          />
        </div>

        {amount > 0 && (
          <div className={`text-center mb-4 p-3 rounded-lg ${
            change >= 0 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            {change >= 0 ? (
              <>
                <div className="text-sm text-green-700">Cambio</div>
                <div className="text-2xl font-bold text-green-700">
                  ${change.toFixed(2)}
                </div>
              </>
            ) : (
              <div className="text-sm font-medium text-red-600">
                Monto insuficiente — faltan ${Math.abs(change).toFixed(2)}
              </div>
            )}
          </div>
        )}

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
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 py-2.5 rounded-lg bg-coffee-900 text-white font-semibold text-sm hover:bg-coffee-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    </div>
  )
}
