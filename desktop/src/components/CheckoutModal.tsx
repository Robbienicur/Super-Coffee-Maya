// desktop/src/components/CheckoutModal.tsx
import { useState } from 'react'
import type { CartItem } from '../store/cartStore'
import supabase from '../lib/supabaseClient'
import { logAction } from '../lib/auditLogger'
import { useAuthStore } from '../store/authStore'
import { formatMXN } from '../utils/formatMXN'
import { isNetworkError, makeClientSaleId, makeTempId, queuePendingSale } from '../lib/offlineQueue'

interface CheckoutModalProps {
  items: CartItem[]
  total: number
  onClose: () => void
  onComplete: (changeGiven: number, offline?: boolean) => void
}

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

export default function CheckoutModal({ items, total, onClose, onComplete }: CheckoutModalProps) {
  const [amountReceived, setAmountReceived] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const profile = useAuthStore((s) => s.profile)

  const trimmed = amountReceived.trim()
  const amountValid = trimmed === '' || AMOUNT_RE.test(trimmed)
  const amount = amountValid && trimmed !== '' ? parseFloat(trimmed) : 0
  const change = amount - total
  const canConfirm = amountValid && amount >= total && !loading

  const queueOffline = async () => {
    if (!profile) {
      setLoading(false)
      return
    }
    await queuePendingSale({
      tempId: makeTempId(),
      client_sale_id: makeClientSaleId(),
      created_at_local: new Date().toISOString(),
      cashier_id: profile.id,
      cashier_email: profile.email,
      total,
      amount_paid: amount,
      change_given: change,
      payment_method: 'cash',
      items: items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
      })),
    })
    setLoading(false)
    setError(null)
    onComplete(change, true)
  }

  const handleConfirm = async () => {
    if (!canConfirm || !profile) return
    setLoading(true)
    setError(null)

    // Sin red: vamos directo a la cola. La cajera ve "venta guardada (offline)".
    if (!navigator.onLine) {
      await queueOffline()
      return
    }

    try {
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
        if (isNetworkError(saleError)) {
          await queueOffline()
          return
        }
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
        await supabase.from('sales').update({ status: 'cancelled' as const }).eq('id', sale.id)
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

      setLoading(false)
      onComplete(change, false)
    } catch (err) {
      if (isNetworkError(err)) {
        await queueOffline()
        return
      }
      setError('Error inesperado al cobrar')
      setLoading(false)
    }
  }

  const invalidAmountMsg = !amountValid
    ? 'Monto inválido. Usa dígitos y hasta 2 decimales.'
    : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-[fade-in_200ms_ease-out]">
      <div className="bg-cream rounded-xl p-6 w-full max-w-sm shadow-xl animate-[scale-in_200ms_ease-out]">
        <h2 className="text-lg font-bold text-coffee-900 mb-4">Cobrar Venta</h2>

        <div className="text-center mb-4">
          <div className="text-sm text-coffee-300">Total a cobrar</div>
          <div className="text-3xl font-bold text-coffee-900">{formatMXN(total)}</div>
        </div>

        <div className="mb-4">
          <label htmlFor="checkout-amount-received" className="block text-sm text-coffee-700 mb-1">Monto recibido</label>
          <input
            id="checkout-amount-received"
            type="text"
            inputMode="decimal"
            autoFocus
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canConfirm) handleConfirm()
            }}
            className={`w-full px-4 py-3 rounded-lg bg-white border-2 text-xl text-center text-coffee-900 outline-none focus:border-coffee-500 ${
              amountValid ? 'border-coffee-200' : 'border-red-400'
            }`}
            placeholder="$0.00"
          />
          {invalidAmountMsg && (
            <p className="mt-1 text-xs text-red-600">{invalidAmountMsg}</p>
          )}
        </div>

        {amountValid && amount > 0 && (
          <div className={`text-center mb-4 p-3 rounded-lg ${
            change >= 0 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            {change >= 0 ? (
              <>
                <div className="text-sm text-green-700">Cambio</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatMXN(change)}
                </div>
              </>
            ) : (
              <div className="text-sm font-medium text-red-600">
                Monto insuficiente — faltan {formatMXN(Math.abs(change))}
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
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando...
              </span>
            ) : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    </div>
  )
}
