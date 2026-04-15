'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart } from 'lucide-react'
import { usePaginatedQuery, type QueryFilter } from '@/hooks/usePaginatedQuery'
import { formatMXN, formatDateMX } from '@/lib/format'
import SalesFilters from '@/components/sales/SalesFilters'
import SalesTable from '@/components/sales/SalesTable'
import SaleDetailModal from '@/components/sales/SaleDetailModal'
import ExportCsvButton from '@/components/shared/ExportCsvButton'
import type { Sale } from '@/types/database'

type SaleWithCashier = Sale & {
  profiles: { name: string; email: string } | null
}

const PAGE_SIZE = 25

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completada',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
}

export default function VentasPage() {
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [selectedSale, setSelectedSale] = useState<SaleWithCashier | null>(null)

  const { data, totalCount, page, setPage, loading, refetch } =
    usePaginatedQuery<SaleWithCashier>({
      table: 'sales',
      select: '*, profiles!cashier_id(name, email)',
      filters,
      orderBy: { column: 'created_at', ascending: false },
      pageSize: PAGE_SIZE,
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-coffee-900">Ventas</h1>
        <ExportCsvButton
          table="sales"
          select="id, total, discount_amount, payment_method, status, notes, created_at"
          filters={filters}
          filename={`ventas-${new Date().toISOString().slice(0, 10)}`}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'created_at', label: 'Fecha', getValue: (r) => formatDateMX(r.created_at as string) },
            { key: 'total', label: 'Total', getValue: (r) => formatMXN(Number(r.total)) },
            { key: 'discount_amount', label: 'Descuento', getValue: (r) => formatMXN(Number(r.discount_amount)) },
            { key: 'payment_method', label: 'Método', getValue: (r) => PAYMENT_LABEL[r.payment_method as string] ?? String(r.payment_method) },
            { key: 'status', label: 'Estado', getValue: (r) => STATUS_LABEL[r.status as string] ?? String(r.status) },
            { key: 'notes', label: 'Notas' },
          ]}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <ShoppingCart size={16} className="text-coffee-500" />
          <CardTitle className="text-sm font-medium text-coffee-500">
            Historial de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SalesFilters onFiltersChange={setFilters} />
          <SalesTable
            data={data}
            totalCount={totalCount}
            page={page}
            pageSize={PAGE_SIZE}
            loading={loading}
            onPageChange={setPage}
            onViewDetail={setSelectedSale}
          />
        </CardContent>
      </Card>

      <SaleDetailModal
        sale={selectedSale}
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        onUpdated={refetch}
      />
    </div>
  )
}
