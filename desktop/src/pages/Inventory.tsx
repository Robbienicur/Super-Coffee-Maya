import { useState, useEffect, useCallback, useMemo } from 'react'
import supabase from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { useBarcode } from '../hooks/useBarcode'
import ProductTable from '../components/inventory/ProductTable'
import ProductFormModal from '../components/inventory/ProductFormModal'
import StockAdjustModal from '../components/inventory/StockAdjustModal'
import DeleteProductModal from '../components/inventory/DeleteProductModal'
import CsvImportModal from '../components/inventory/CsvImportModal'
import type { Product } from '../types/database'

const CATEGORIES = ['Bebidas', 'Snacks', 'Lácteos', 'Abarrotes', 'Limpieza', 'Otros']

export default function Inventory() {
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = profile?.role === 'admin'

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Modal state: undefined = closed, null = add new, Product = edit
  const [formProduct, setFormProduct] = useState<Product | null | undefined>(undefined)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [showCsvImport, setShowCsvImport] = useState(false)

  const anyModalOpen =
    formProduct !== undefined || stockProduct !== null || deleteProduct !== null || showCsvImport

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name', { ascending: true })

    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('inventory-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchProducts])

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Barcode scan in inventory opens edit modal for that product
  const handleScan = useCallback(
    (barcode: string) => {
      const product = products.find((p) => p.barcode === barcode)
      if (product) {
        setFormProduct(product)
      } else {
        showToast(`Código "${barcode}" no encontrado`)
      }
    },
    [products, showToast]
  )

  useBarcode({ onScan: handleScan, enabled: !anyModalOpen })

  const filteredProducts = useMemo(() => {
    let list = products

    if (categoryFilter) {
      list = list.filter((p) => p.category === categoryFilter)
    }

    if (showLowStock) {
      list = list.filter((p) => p.stock <= p.min_stock)
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.barcode ?? '').toLowerCase().includes(term)
      )
    }

    return list
  }, [products, categoryFilter, showLowStock, search])

  const lowStockCount = useMemo(
    () => products.filter((p) => p.is_active && p.stock <= p.min_stock).length,
    [products]
  )

  const handleProductSaved = useCallback(() => {
    setFormProduct(undefined)
    fetchProducts()
    showToast('Producto guardado correctamente')
  }, [fetchProducts, showToast])

  const handleStockSaved = useCallback(() => {
    setStockProduct(null)
    fetchProducts()
    showToast('Stock actualizado correctamente')
  }, [fetchProducts, showToast])

  const handleProductDeleted = useCallback(() => {
    setDeleteProduct(null)
    fetchProducts()
    showToast('Producto desactivado')
  }, [fetchProducts, showToast])

  const handleCsvImported = useCallback(() => {
    setShowCsvImport(false)
    fetchProducts()
    showToast('Importación completada')
  }, [fetchProducts, showToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-coffee-300">Cargando inventario...</p>
      </div>
    )
  }

  // Summary label
  const summaryParts: string[] = []
  if (showLowStock) summaryParts.push('con stock bajo')
  if (categoryFilter) summaryParts.push(`en ${categoryFilter}`)
  const suffix = summaryParts.length > 0 ? ` ${summaryParts.join(' ')}` : ''
  const summaryLabel = `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''}${suffix}`

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header / Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-coffee-100 text-coffee-900 text-sm placeholder-coffee-400 outline-none focus:ring-2 focus:ring-coffee-400 border border-transparent focus:border-coffee-400"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-coffee-100 text-coffee-800 text-sm outline-none focus:ring-2 focus:ring-coffee-400 border border-transparent focus:border-coffee-400"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button
          onClick={() => setShowLowStock((v) => !v)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            showLowStock
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-coffee-100 text-coffee-800 hover:bg-coffee-200'
          }`}
        >
          Stock bajo {lowStockCount > 0 && `(${lowStockCount})`}
        </button>

        <button
          onClick={() => setFormProduct(null)}
          className="px-4 py-2 rounded-lg bg-coffee-900 text-white text-sm font-medium hover:bg-coffee-800 transition-colors"
        >
          + Agregar producto
        </button>

        {isAdmin && (
          <button
            onClick={() => setShowCsvImport(true)}
            className="px-4 py-2 rounded-lg bg-coffee-700 text-white text-sm font-medium hover:bg-coffee-600 transition-colors"
          >
            Importar CSV
          </button>
        )}
      </div>

      {/* Summary */}
      <p className="text-xs text-coffee-400">{summaryLabel}</p>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <ProductTable
          products={filteredProducts}
          isAdmin={isAdmin ?? false}
          onEdit={(product) => setFormProduct(product)}
          onAdjustStock={(product) => setStockProduct(product)}
          onDeactivate={(product) => setDeleteProduct(product)}
        />
      </div>

      {/* Modals */}
      {formProduct !== undefined && (
        <ProductFormModal
          product={formProduct}
          onClose={() => setFormProduct(undefined)}
          onSaved={handleProductSaved}
        />
      )}

      {stockProduct !== null && (
        <StockAdjustModal
          product={stockProduct}
          onClose={() => setStockProduct(null)}
          onSaved={handleStockSaved}
        />
      )}

      {deleteProduct !== null && (
        <DeleteProductModal
          product={deleteProduct}
          onClose={() => setDeleteProduct(null)}
          onDeleted={handleProductDeleted}
        />
      )}

      {showCsvImport && (
        <CsvImportModal
          onClose={() => setShowCsvImport(false)}
          onImported={handleCsvImported}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium z-50 bg-green-600 text-white">
          {toast}
        </div>
      )}
    </div>
  )
}
