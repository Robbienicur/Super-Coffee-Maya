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
import { Eye } from 'lucide-react'
import { formatMXN, formatDateMX } from '@/lib/format'
import type { Sale } from '@/types/database'
import PaginationControls from '@/components/shared/PaginationControls'

type SaleWithCashier = Sale & {
  profiles: { name: string; email: string } | null
}

interface SalesTableProps {
  data: SaleWithCashier[]
  totalCount: number
  page: number
  pageSize: number
  loading: boolean
  onPageChange: (page: number) => void
  onViewDetail: (sale: SaleWithCashier) => void
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed: { label: 'Completada', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
  refunded: { label: 'Reembolsada', variant: 'secondary' },
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

export default function SalesTable({
  data,
  totalCount,
  page,
  pageSize,
  loading,
  onPageChange,
  onViewDetail,
}: SalesTableProps) {
  if (loading) {
    return <p className="text-coffee-300 text-sm py-8 text-center">Cargando ventas...</p>
  }

  if (data.length === 0) {
    return <p className="text-coffee-300 text-sm py-8 text-center">No se encontraron ventas.</p>
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Cajero</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Descuento</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((sale) => {
            const statusInfo = STATUS_BADGE[sale.status] ?? { label: sale.status, variant: 'outline' as const }
            return (
              <TableRow key={sale.id}>
                <TableCell className="text-sm">{formatDateMX(sale.created_at)}</TableCell>
                <TableCell className="text-sm">
                  {sale.profiles?.name || sale.profiles?.email || '—'}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatMXN(sale.total)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {sale.discount_amount > 0 ? formatMXN(sale.discount_amount) : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method}
                </TableCell>
                <TableCell>
                  <Badge variant={statusInfo.variant} className="text-[10px]">
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onViewDetail(sale)}
                  >
                    <Eye size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <PaginationControls
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  )
}
