'use client'

import { useState } from 'react'
import { Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePaginatedQuery, type QueryFilter } from '@/hooks/usePaginatedQuery'
import { formatMXN, formatDateMX } from '@/lib/format'
import CorteDetailModal from '@/components/cortes/CorteDetailModal'
import CortesFilters from '@/components/cortes/CortesFilters'
import ExportCsvButton from '@/components/shared/ExportCsvButton'
import type { CashSession } from '@/types/database'

type SessionWithProfiles = CashSession & {
  cashier: { name: string; email: string } | null
  closer: { name: string; email: string } | null
}

const PAGE_SIZE = 25

export default function CortesPage() {
  const [filters, setFilters] = useState<QueryFilter[]>([])
  const [selected, setSelected] = useState<SessionWithProfiles | null>(null)

  const { data, totalCount, page, setPage, loading } =
    usePaginatedQuery<SessionWithProfiles>({
      table: 'cash_sessions',
      select: '*, cashier:profiles!cash_sessions_cashier_id_fkey(name, email), closer:profiles!cash_sessions_closed_by_fkey(name, email)',
      filters,
      orderBy: { column: 'opened_at', ascending: false },
      pageSize: PAGE_SIZE,
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-coffee-900">Cortes de caja</h1>
        <ExportCsvButton
          table="cash_sessions"
          select="*, cashier:profiles!cash_sessions_cashier_id_fkey(name)"
          filters={filters}
          orderBy={{ column: 'opened_at', ascending: false }}
          filename={`cortes-${new Date().toISOString().slice(0, 10)}`}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'opened_at', label: 'Apertura' },
            { key: 'closed_at', label: 'Cierre' },
            {
              key: 'cashier',
              label: 'Cajera',
              getValue: (row) => {
                const c = row.cashier as { name?: string } | null
                return c?.name ?? ''
              },
            },
            { key: 'status', label: 'Estado' },
            { key: 'opening_float', label: 'Fondo' },
            { key: 'cash_sales', label: 'Ventas efectivo' },
            { key: 'expected_cash', label: 'Esperado' },
            { key: 'closing_cash_counted', label: 'Contado' },
            { key: 'difference', label: 'Diferencia' },
          ]}
        />
      </div>

      <CortesFilters onFiltersChange={setFilters} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet size={16} />
            {totalCount} {totalCount === 1 ? 'corte' : 'cortes'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-coffee-500 text-sm p-4">Cargando...</p>
          ) : data.length === 0 ? (
            <p className="text-coffee-500 text-sm p-4">Sin resultados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apertura</TableHead>
                  <TableHead>Cajera</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Fondo</TableHead>
                  <TableHead className="text-right">Ventas efec.</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateMX(s.opened_at)}</TableCell>
                    <TableCell>{s.cashier?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'closed' ? 'default' : 'secondary'}>
                        {s.status === 'open' ? 'Abierta' : s.status === 'closing' ? 'Cerrando' : 'Cerrada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatMXN(s.opening_float)}</TableCell>
                    <TableCell className="text-right">{s.cash_sales !== null ? formatMXN(s.cash_sales) : '—'}</TableCell>
                    <TableCell className="text-right">{s.expected_cash !== null ? formatMXN(s.expected_cash) : '—'}</TableCell>
                    <TableCell className="text-right">{s.closing_cash_counted !== null ? formatMXN(s.closing_cash_counted) : '—'}</TableCell>
                    <TableCell className="text-right">
                      <DifferenceCell value={s.difference} closed={s.status === 'closed'} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Ver detalle del corte"
                        onClick={() => setSelected(s)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-coffee-500">
              {totalCount} resultados — Página {page + 1} de {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= totalCount}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <CorteDetailModal session={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function DifferenceCell({ value, closed }: { value: number; closed: boolean }) {
  if (!closed) return <span className="text-coffee-400">—</span>
  const abs = Math.abs(value)
  if (abs < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-green-700">
        <CheckCircle2 size={14} /> {formatMXN(0)}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 ${value < 0 ? 'text-red-700' : 'text-amber-700'}`}>
      <AlertTriangle size={14} /> {value > 0 ? '+' : ''}{formatMXN(value)}
    </span>
  )
}
