// desktop/src/pages/POS.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Wallet } from 'lucide-react'
import supabase from '../lib/supabaseClient'
import { useBarcode } from '../hooks/useBarcode'
import { useCartStore } from '../store/cartStore'
import { useSessionStore, isSessionStale } from '../store/sessionStore'
import { useNavigationStore } from '../store/navigationStore'
import ProductSearch from '../components/ProductSearch'
import Cart from '../components/Cart'
import CheckoutModal from '../components/CheckoutModal'
import CancelSaleModal from '../components/CancelSaleModal'
import type { Product } from '../types/database'
import { formatMXN } from '../utils/formatMXN'
import { getCachedProducts, setCachedProducts } from '../lib/offlineQueue'

export default function POS() {
  const [products, setProducts] = useState<Product[]>([])
  const [popularity, setPopularity] = useState<Map<string, number>>(new Map())
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
      // Paginamos: PostgREST limita a 1000 filas por request (max-rows config),
      // y el inventario real tiene >1500 productos activos.
      const pageSize = 1000
      const all: Product[] = []
      for (let page = 0; ; page++) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name')
          .range(page * pageSize, (page + 1) * pageSize - 1)
        if (error || !data || data.length === 0) break
        all.push(...data)
        if (data.length < pageSize) break
      }
      const { data: topData } = await supabase.rpc('top_selling_products', { window_days: 30 })

      if (all.length > 0) {
        setProducts(all)
        setCachedProducts(all)
      }
      if (topData) {
        const map = new Map<string, number>()
        for (const row of topData as { product_id: string; total_qty: number }[]) {
          map.set(row.product_id, Number(row.total_qty))
        }
        setPopularity(map)
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
        // Se permite vender con stock 0 o negativo — puede que haya llegado
        // mercancía sin registrar. Solo avisamos al cajero.
        if (product.track_stock && product.stock <= 0) {
          showToast(`⚠ "${product.name}" sin stock registrado — acuérdate de actualizar inventario`, 'error')
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

  const handleCheckoutComplete = (changeGiven: number, offline = false) => {
    clear()
    setShowCheckout(false)
    fetchProducts()
    if (offline) {
      showToast('Venta guardada (offline)', 'success')
    } else {
      showToast(`Venta completada — Cambio: ${formatMXN(changeGiven)}`)
    }
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
    <div className="flex flex-col h-full">
      <NoSessionBanner />
      <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-[3]">
        <ProductSearch
          products={products}
          popularity={popularity}
          onAddToCart={(product) => {
            if (product.track_stock && product.stock <= 0) {
              showToast(`⚠ "${product.name}" sin stock registrado — acuérdate de actualizar inventario`, 'error')
            }
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
    </div>
  )
}

function NoSessionBanner() {
  const session = useSessionStore((s) => s.session)
  const setPage = useNavigationStore((s) => s.setPage)

  if (!session) {
    return (
      <div className="mb-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
        <Wallet size={18} className="text-amber-700 flex-shrink-0" />
        <div className="flex-1 text-sm text-amber-900">
          <span className="font-semibold">No hay caja abierta.</span>{' '}
          Abre una sesión antes de cobrar.
        </div>
        <button
          onClick={() => setPage('cash-session')}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-700 text-white hover:bg-amber-800 transition-colors"
        >
          Abrir caja
        </button>
      </div>
    )
  }

  if (isSessionStale(session)) {
    return (
      <div className="mb-3 px-4 py-3 rounded-lg bg-red-50 border border-red-300 flex items-center gap-3">
        <Wallet size={18} className="text-red-700 flex-shrink-0" />
        <div className="flex-1 text-sm text-red-900">
          <span className="font-semibold">Tienes una caja abierta de ayer.</span>{' '}
          Tienes que cerrarla (reporte Z) antes de seguir vendiendo.
        </div>
        <button
          onClick={() => setPage('cash-session')}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-700 text-white hover:bg-red-800 transition-colors"
        >
          Cerrar caja
        </button>
      </div>
    )
  }

  return null
}
