// desktop/src/components/Cart.tsx
import { useState } from 'react'
import { ShoppingCart, X, Check } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { logAction } from '../lib/auditLogger'
import { formatMXN } from '../utils/formatMXN'

interface CartProps {
  onCheckout: () => void
  onCancelPastSale: () => void
}

export default function Cart({ onCheckout, onCancelPastSale }: CartProps) {
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const total = useCartStore((s) => s.total)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [confirmClear, setConfirmClear] = useState(false)

  const handleClear = () => {
    if (items.length === 0) return
    setConfirmClear(true)
  }

  const doClear = async () => {
    const snapshot = items
    const totalSnap = total()
    const shouldAudit = isAuthenticated && snapshot.length >= 3
    clear()
    setConfirmClear(false)
    if (shouldAudit) {
      await logAction('CART_DISCARDED', 'system', undefined, undefined, {
        total: totalSnap,
        items_count: snapshot.reduce((sum, i) => sum + i.quantity, 0),
        distinct_items: snapshot.length,
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
      <div className="font-bold text-coffee-900 mb-3 text-base">
        <ShoppingCart size={18} className="inline -mt-0.5" /> Carrito ({items.reduce((sum, i) => sum + i.quantity, 0)})
      </div>

      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-coffee-300 text-sm">
            Escanea o busca un producto
          </div>
        ) : (
          <div className="divide-y divide-coffee-100">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-2 py-2 px-1"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-coffee-900 truncate">
                    {item.product.name}
                  </div>
                  <div className="text-xs text-coffee-300">
                    {formatMXN(item.product.price)} c/u
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity - 1)
                    }
                    className="w-6 h-6 rounded bg-coffee-100 text-coffee-700 text-sm hover:bg-coffee-200 flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-coffee-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity + 1)
                    }
                    className="w-6 h-6 rounded bg-coffee-100 text-coffee-700 text-sm hover:bg-coffee-200 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                <div className="w-20 text-right text-sm font-medium text-coffee-900">
                  {formatMXN(item.product.price * item.quantity)}
                </div>

                <button
                  onClick={() => removeItem(item.product.id)}
                  className="text-red-400 hover:text-red-600 text-sm ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t-2 border-coffee-900 pt-3 mt-3">
        <div className="flex justify-between items-center font-bold text-xl text-coffee-900 mb-3">
          <span>TOTAL</span>
          <span>{formatMXN(total())}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            disabled={items.length === 0}
            className="flex-1 py-2.5 rounded-lg bg-danger text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.97]"
          >
            Cancelar
          </button>
          <button
            onClick={onCheckout}
            disabled={items.length === 0}
            className="flex-1 py-3 rounded-lg bg-coffee-900 text-white font-semibold text-sm hover:bg-coffee-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5"
          >
            <Check size={16} /> Cobrar
          </button>
        </div>

        <button
          onClick={onCancelPastSale}
          className="w-full mt-2 text-xs text-coffee-300 hover:text-red-500 transition-colors"
        >
          Cancelar venta pasada
        </button>
      </div>

      {confirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-[fade-in_200ms_ease-out]">
          <div className="bg-cream rounded-xl p-6 w-full max-w-sm shadow-xl animate-[scale-in_200ms_ease-out]">
            <h2 className="text-lg font-bold text-coffee-900 mb-2">¿Vaciar carrito?</h2>
            <p className="text-sm text-coffee-500 mb-4">
              Se descartarán {items.length} producto{items.length !== 1 ? 's' : ''} distinto{items.length !== 1 ? 's' : ''}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 py-2.5 rounded-lg border border-coffee-200 text-coffee-700 text-sm hover:bg-coffee-100 transition-colors"
              >
                No, conservar
              </button>
              <button
                onClick={doClear}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                Sí, vaciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
