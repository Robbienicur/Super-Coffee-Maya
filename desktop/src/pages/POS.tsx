// desktop/src/pages/POS.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '../lib/supabaseClient'
import { useBarcode } from '../hooks/useBarcode'
import { useCartStore } from '../store/cartStore'
import ProductSearch from '../components/ProductSearch'
import Cart from '../components/Cart'
import CheckoutModal from '../components/CheckoutModal'
import CancelSaleModal from '../components/CancelSaleModal'
import type { Product } from '../types/database'

const formatMXN = (amount: number) =>
  amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

export default function POS() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showCancelSale, setShowCancelSale] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const total = useCartStore((s) => s.total)
  const clear = useCartStore((s) => s.clear)

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')

    setProducts(data ?? [])
    setLoadingProducts(false)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleScan = useCallback(
    (barcode: string) => {
      const product = products.find((p) => p.barcode === barcode)
      if (product) {
        if (product.stock <= 0) {
          setToast(`"${product.name}" sin existencias`)
          setTimeout(() => setToast(null), 3000)
          return
        }
        addItem(product)
      } else {
        setToast(`Código "${barcode}" no encontrado — busca por nombre`)
        setTimeout(() => setToast(null), 3000)
        searchInputRef.current?.focus()
      }
    },
    [products, addItem]
  )

  const modalOpen = showCheckout || showCancelSale
  useBarcode({ onScan: handleScan, enabled: !modalOpen })

  const handleCheckoutComplete = (changeGiven: number) => {
    clear()
    setShowCheckout(false)
    fetchProducts()
    setToast(`Venta completada — Cambio: ${formatMXN(changeGiven)}`)
    setTimeout(() => setToast(null), 4000)
  }

  if (loadingProducts) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-coffee-300">Cargando productos...</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-[3]">
        <ProductSearch
          products={products}
          onAddToCart={(product) => {
            if (product.stock <= 0) return
            addItem(product)
          }}
          searchInputRef={searchInputRef}
        />
      </div>

      <div className="flex-[2]">
        <Cart
          onCheckout={() => setShowCheckout(true)}
          onCancelPastSale={() => setShowCancelSale(true)}
        />
      </div>

      {showCheckout && (
        <CheckoutModal
          items={items}
          total={total()}
          onClose={() => setShowCheckout(false)}
          onComplete={handleCheckoutComplete}
        />
      )}

      {showCancelSale && (
        <CancelSaleModal onClose={() => setShowCancelSale(false)} />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium z-50 ${
          toast.startsWith('Venta completada')
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast}
        </div>
      )}
    </div>
  )
}
