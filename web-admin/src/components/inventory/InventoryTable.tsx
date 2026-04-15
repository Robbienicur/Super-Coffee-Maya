'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Power } from 'lucide-react'
import { formatMXN } from '@/lib/format'
import type { Product } from '@/types/database'
import PaginationControls from '@/components/shared/PaginationControls'

interface InventoryTableProps {
  data: Product[]
  totalCount: number
  page: number
  pageSize: number
  loading: boolean
  onPageChange: (page: number) => void
  onEdit: (product: Product) => void
  onToggleActive: (product: Product) => void
  showPagination?: boolean
}

export default function InventoryTable({
  data,
  totalCount,
  page,
  pageSize,
  loading,
  onPageChange,
  onEdit,
  onToggleActive,
  showPagination = true,
}: InventoryTableProps) {
  if (loading) {
    return <p className="text-coffee-300 text-sm py-8 text-center">Cargando productos...</p>
  }

  if (data.length === 0) {
    return <p className="text-coffee-300 text-sm py-8 text-center">No se encontraron productos.</p>
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Costo</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Mín</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((product) => {
            const isLowStock = product.stock <= product.min_stock
            return (
              <TableRow key={product.id}>
                <TableCell className="text-sm text-coffee-500 font-mono">
                  {product.barcode || '—'}
                </TableCell>
                <TableCell className="text-sm font-medium text-coffee-900">
                  {product.name}
                </TableCell>
                <TableCell className="text-sm">{product.category}</TableCell>
                <TableCell className="text-right text-sm">
                  {formatMXN(product.price)}
                </TableCell>
                <TableCell className="text-right text-sm text-coffee-500">
                  {formatMXN(product.cost_price)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  <span className={isLowStock ? 'text-danger font-bold' : ''}>
                    {product.stock}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm text-coffee-500">
                  {product.min_stock}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={product.is_active ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {product.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => onEdit(product)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => onToggleActive(product)}>
                      <Power size={14} className={product.is_active ? 'text-success' : 'text-coffee-300'} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {showPagination && (
        <PaginationControls
          page={page}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
