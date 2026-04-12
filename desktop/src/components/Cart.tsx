// desktop/src/components/Cart.tsx
import { useCartStore } from '../store/cartStore'

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

  const handleClear = () => {
    if (items.length === 0) return
    if (confirm('¿Vaciar carrito?')) {
      clear()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border-2 border-coffee-200 p-4">
      <div className="font-bold text-coffee-900 mb-3 text-base">
        🛒 Carrito ({items.reduce((sum, i) => sum + i.quantity, 0)})
      </div>

      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-coffee-300 text-sm">
            Escanea o busca un producto
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-2 py-2 px-1 border-b border-coffee-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-coffee-900 truncate">
                    {item.product.name}
                  </div>
                  <div className="text-xs text-coffee-300">
                    ${item.product.price.toFixed(2)} c/u
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
                  ${(item.product.price * item.quantity).toFixed(2)}
                </div>

                <button
                  onClick={() => removeItem(item.product.id)}
                  className="text-red-400 hover:text-red-600 text-sm ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t-2 border-coffee-900 pt-3 mt-3">
        <div className="flex justify-between items-center font-bold text-xl text-coffee-900 mb-3">
          <span>TOTAL</span>
          <span>${total().toFixed(2)}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            disabled={items.length === 0}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onCheckout}
            disabled={items.length === 0}
            className="flex-1 py-2.5 rounded-lg bg-coffee-900 text-white font-semibold text-sm hover:bg-coffee-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Cobrar
          </button>
        </div>

        <button
          onClick={onCancelPastSale}
          className="w-full mt-2 text-xs text-coffee-300 hover:text-red-500 transition-colors"
        >
          Cancelar venta pasada
        </button>
      </div>
    </div>
  )
}
