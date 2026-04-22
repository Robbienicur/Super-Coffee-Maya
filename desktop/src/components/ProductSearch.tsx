// desktop/src/components/ProductSearch.tsx
import { useState, useMemo } from 'react'
import type { Product } from '../types/database'
import { formatMXN } from '../utils/formatMXN'
import { normalizeSearch } from '../utils/normalizeSearch'

interface ProductSearchProps {
  products: Product[]
  popularity?: Map<string, number>
  onAddToCart: (product: Product) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

export default function ProductSearch({ products, popularity, onAddToCart, searchInputRef }: ProductSearchProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products]
  )

  const filtered = useMemo(() => {
    let result = products
    const searching = search.trim().length > 0
    // Si el cajero está buscando, ignoramos el filtro de categoría —
    // la búsqueda va contra todo el catálogo.
    if (selectedCategory && !searching) {
      result = result.filter((p) => p.category === selectedCategory)
    }
    if (searching) {
      const q = normalizeSearch(search)
      result = result.filter((p) => normalizeSearch(p.name).includes(q))
    }
    // Orden: (1) con stock primero, (2) más vendidos arriba, (3) alfabético.
    return [...result].sort((a, b) => {
      const aOut = a.track_stock && a.stock <= 0 ? 1 : 0
      const bOut = b.track_stock && b.stock <= 0 ? 1 : 0
      if (aOut !== bOut) return aOut - bOut
      const aPop = popularity?.get(a.id) ?? 0
      const bPop = popularity?.get(b.id) ?? 0
      if (aPop !== bPop) return bPop - aPop
      return a.name.localeCompare(b.name, 'es')
    })
  }, [products, selectedCategory, search, popularity])

  return (
    <div className="flex flex-col h-full">
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Buscar producto por nombre..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg bg-coffee-100 text-coffee-900 placeholder-coffee-300 outline-none focus:ring-2 focus:ring-coffee-500 mb-3"
      />

      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !selectedCategory
              ? 'bg-coffee-700 text-white'
              : 'bg-white text-coffee-700 border border-coffee-200 hover:bg-coffee-100'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              cat === selectedCategory
                ? 'bg-coffee-700 text-white'
                : 'bg-white text-coffee-700 border border-coffee-200 hover:bg-coffee-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto grid grid-cols-3 gap-3 auto-rows-min content-start">
        {filtered.map((product) => {
          const outOfStock = product.track_stock && product.stock <= 0
          const lowStock = product.track_stock && product.stock > 0 && product.stock <= product.min_stock
          const popCount = popularity?.get(product.id) ?? 0
          const isTopSeller = popCount >= 5 && !outOfStock

          return (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              className={`text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                outOfStock
                  ? 'bg-red-50 border-red-200 shadow-sm hover:shadow-md hover:border-red-400 hover:-translate-y-0.5 active:scale-[0.98]'
                  : 'bg-white border-coffee-100 shadow-sm hover:shadow-md hover:border-coffee-300 hover:-translate-y-0.5 active:scale-[0.98]'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-sm text-coffee-900 leading-tight">
                  {product.name}
                </span>
                <div className="flex gap-1 ml-1 flex-shrink-0">
                  {isTopSeller && (
                    <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full" title={`Vendido ${popCount} veces en 30 días`}>
                      ★ Top
                    </span>
                  )}
                  {lowStock && (
                    <span className="text-[10px] bg-warning text-white px-1.5 py-0.5 rounded-full">
                      Bajo
                    </span>
                  )}
                </div>
              </div>
              <div className="text-base font-bold text-coffee-900">
                {formatMXN(product.price)}
              </div>
              {product.track_stock && (
                <div className={`text-xs mt-0.5 font-medium ${outOfStock ? 'text-red-600' : 'text-coffee-300'}`}>
                  {outOfStock
                    ? product.stock < 0
                      ? `Stock ${product.stock} — actualiza inventario`
                      : 'Sin piezas — vendible, actualiza inventario'
                    : `${product.stock} disponibles`}
                </div>
              )}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-8 text-coffee-300">
            No se encontraron productos
          </div>
        )}
      </div>
    </div>
  )
}
