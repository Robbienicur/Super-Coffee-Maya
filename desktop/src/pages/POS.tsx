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
import { formatMXN } from '../utils/formatMXN'
import { getCachedProducts, setCachedProducts } from '../lib/offlineQueue'

export default function POS() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showCancelSale, setShowCancelSale] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; phase: 'entering' | 'visible' | 'exiting' } | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, phase: 'entering' })
    requestAnimationFrame(() => setToast((t) => t ? { ...t, phase: 'visible' } : null))
    setTimeout(() => {
      setToast((t) => t ? { ...t, phase: 'exiting' } : null)
      setTimeout(() => setToast(null), 200)
    }, 3500)
  }, [])

  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const total = useCartStore((s) => s.total)
  const clear = useCartStore((s) => s.clear)

  const fetchProducts = useCallback(async () => {
    // Si hay cache, pintamos ya para que la app sea usable aunque no responda la red.
    const cached = getCachedProducts()
    if (cached.length > 0) {
      setProducts(cached.filter((p) => p.is_active))
      setLoadingProducts(false)
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (!error && data) {
        setProducts(data)
        setCachedProducts(data)
      }
    } catch {
      // offline: nos quedamos con el cache (si ya lo pintamos arriba).
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleScan = useCallback(
    (barcode: string) => {
      const product = products.find((p) => p.barcode === barcode)
      if (product) {
        if (product.track_stock && product.stock <= 0) {
          showToast(`"${product.name}" sin existencias`, 'error')
          return
        }
        addItem(product)
      } else {
        showToast(`Código "${barcode}" no encontrado — busca por nombre`, 'error')
        searchInputRef.current?.focus()
      }
    },
    [products, addItem, showToast]
  )

  const modalOpen = showCheckout || showCancelSale
  useBarcode({ onScan: handleScan, enabled: !modalOpen })

  const handleCheckoutComplete = (changeGiven: number) => {
    clear()
    setShowCheckout(false)
    fetchProducts()
    showToast(`Venta completada — Cambio: ${formatMXN(changeGiven)}`)
  }

  if (loadingProducts) {
    return (
      <div className="flex gap-4 h-full">
        <div className="flex-[3]">
          <div className="h-10 bg-coffee-100 rounded-lg mb-3 animate-pulse" />
          <div className="flex gap-2 mb-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-20 bg-coffee-100 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-coffee-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-[2]">
          <div className="h-full bg-coffee-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-[3]">
        <ProductSearch
          products={products}
          onAddToCart={(product) => {
            if (product.track_stock && product.stock <= 0) return
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
        <div className={`fixed bottom-6 left-1/2 px-5 py-3 rounded-lg shadow-2xl text-sm font-medium z-50 text-white ${
          toast.type === 'success' ? 'bg-success' : 'bg-danger'
        } ${toast.phase === 'exiting' ? 'toast-exit' : 'toast-enter'}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
