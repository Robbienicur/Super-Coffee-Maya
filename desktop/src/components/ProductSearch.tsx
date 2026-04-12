// desktop/src/components/ProductSearch.tsx
import { useState, useMemo } from 'react'
import type { Product } from '../types/database'

interface ProductSearchProps {
  products: Product[]
  onAddToCart: (product: Product) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

export default function ProductSearch({ products, onAddToCart, searchInputRef }: ProductSearchProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products]
  )

  const filtered = useMemo(() => {
    let result = products
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }
    return result
  }, [products, selectedCategory, search])

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
          const outOfStock = product.stock <= 0
          const lowStock = product.stock > 0 && product.stock <= product.min_stock

          return (
            <button
              key={product.id}
              disabled={outOfStock}
              onClick={() => onAddToCart(product)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                outOfStock
                  ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                  : 'bg-white border-coffee-200 hover:border-coffee-500 hover:shadow-sm cursor-pointer'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-sm text-coffee-900 leading-tight">
                  {product.name}
                </span>
                {lowStock && (
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">
                    Bajo
                  </span>
                )}
              </div>
              <div className="text-base font-bold text-coffee-900">
                ${product.price.toFixed(2)}
              </div>
              <div className="text-xs text-coffee-300 mt-0.5">
                {outOfStock ? 'Sin stock' : `${product.stock} disponibles`}
              </div>
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
