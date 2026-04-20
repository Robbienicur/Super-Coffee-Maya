'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Plus } from 'lucide-react'
import { usePaginatedQuery, type QueryFilter } from '@/hooks/usePaginatedQuery'
import { formatMXN } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { insertAuditLog } from '@/lib/auditLog'
import InventoryFilters from '@/components/inventory/InventoryFilters'
import InventoryTable from '@/components/inventory/InventoryTable'
import ProductFormModal from '@/components/inventory/ProductFormModal'
import ConfirmModal from '@/components/shared/ConfirmModal'
import ExportCsvButton from '@/components/shared/ExportCsvButton'
import type { Product } from '@/types/database'

const PAGE_SIZE = 25

export default function InventarioPage() {
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [lowStockActive, setLowStockActive] = useState(false)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [lowStockLoading, setLowStockLoading] = useState(false)

  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [toggleProduct, setToggleProduct] = useState<Product | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)

  const { data, totalCount, page, setPage, loading, refetch } =
    usePaginatedQuery<Product>({
      table: 'products',
      select: '*',
      filters,
      orderBy: { column: 'name', ascending: true },
      pageSize: PAGE_SIZE,
    })

  // Fetch low stock products client-side (column-to-column comparison not supported by PostgREST)
  useEffect(() => {
    if (!lowStockActive) return
    setLowStockLoading(true)
    const supabase = createClient()
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('stock', { ascending: true })
      .then(({ data: products }) => {
        const low = ((products as Product[]) ?? []).filter(
          (p) => p.track_stock && p.stock <= p.min_stock
        )
        setLowStockProducts(low)
        setLowStockLoading(false)
      })
  }, [lowStockActive])

  function handleCreate() {
    setEditProduct(null)
    setFormOpen(true)
  }

  function handleEdit(product: Product) {
    setEditProduct(product)
    setFormOpen(true)
  }

  async function handleToggleActive() {
    if (!toggleProduct) return
    setToggleLoading(true)
    const supabase = createClient()
    const newActive = !toggleProduct.is_active

    await supabase
      .from('products')
      // @ts-expect-error: supabase-js v2.103 schema inference issue
      .update({ is_active: newActive })
      .eq('id', toggleProduct.id)

    await insertAuditLog(
      'PRODUCT_UPDATED',
      'product',
      toggleProduct.id,
      { is_active: toggleProduct.is_active },
      { is_active: newActive }
    )

    setToggleLoading(false)
    setToggleProduct(null)
    refetch()
  }

  const displayData = lowStockActive ? lowStockProducts : data
  const displayLoading = lowStockActive ? lowStockLoading : loading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-coffee-900">Inventario</h1>
        <div className="flex gap-2">
          <ExportCsvButton
            table="products"
            select="barcode, name, category, price, cost_price, stock, min_stock, is_active"
            filters={filters}
            filename={`inventario-${new Date().toISOString().slice(0, 10)}`}
            columns={[
              { key: 'barcode', label: 'Código' },
              { key: 'name', label: 'Nombre' },
              { key: 'category', label: 'Categoría' },
              { key: 'price', label: 'Precio', getValue: (r) => formatMXN(Number(r.price)) },
              { key: 'cost_price', label: 'Costo', getValue: (r) => formatMXN(Number(r.cost_price)) },
              { key: 'stock', label: 'Stock' },
              { key: 'min_stock', label: 'Stock Mín' },
              { key: 'is_active', label: 'Activo', getValue: (r) => r.is_active ? 'Sí' : 'No' },
            ]}
          />
          <Button size="sm" onClick={handleCreate}>
            <Plus size={16} />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Package size={16} className="text-coffee-500" />
          <CardTitle className="text-sm font-medium text-coffee-500">
            Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InventoryFilters
            onFiltersChange={setFilters}
            onLowStockToggle={setLowStockActive}
            lowStockActive={lowStockActive}
          />
          <InventoryTable
            data={displayData}
            totalCount={lowStockActive ? lowStockProducts.length : totalCount}
            page={lowStockActive ? 1 : page}
            pageSize={PAGE_SIZE}
            loading={displayLoading}
            onPageChange={setPage}
            onEdit={handleEdit}
            onToggleActive={setToggleProduct}
            showPagination={!lowStockActive}
          />
        </CardContent>
      </Card>

      <ProductFormModal
        product={editProduct}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refetch}
      />

      <ConfirmModal
        open={!!toggleProduct}
        onClose={() => setToggleProduct(null)}
        onConfirm={handleToggleActive}
        title={toggleProduct?.is_active ? 'Desactivar Producto' : 'Activar Producto'}
        description={`¿Estás seguro de ${toggleProduct?.is_active ? 'desactivar' : 'activar'} "${toggleProduct?.name}"?`}
        confirmLabel={toggleProduct?.is_active ? 'Desactivar' : 'Activar'}
        variant={toggleProduct?.is_active ? 'destructive' : 'default'}
        loading={toggleLoading}
      />
    </div>
  )
}
