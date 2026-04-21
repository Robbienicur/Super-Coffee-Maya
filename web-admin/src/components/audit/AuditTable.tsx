'use client'

import { useState, Fragment } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatDateMX } from '@/lib/format'
import type { AuditLog } from '@/types/database'
import PaginationControls from '@/components/shared/PaginationControls'

interface AuditTableProps {
  data: AuditLog[]
  totalCount: number
  page: number
  pageSize: number
  loading: boolean
  onPageChange: (page: number) => void
}

const SUSPICIOUS_ACTIONS = new Set([
  'SALE_CANCELLED',
  'SALE_REFUNDED',
  'PRICE_CHANGED',
  'STOCK_ADJUSTED',
])

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  LOGIN: { label: 'Inicio sesión', variant: 'secondary' },
  LOGOUT: { label: 'Cierre sesión', variant: 'outline' },
  SALE_COMPLETED: { label: 'Venta', variant: 'default' },
  SALE_CANCELLED: { label: 'Cancelación', variant: 'destructive' },
  SALE_REFUNDED: { label: 'Reembolso', variant: 'destructive' },
  PRODUCT_CREATED: { label: 'Producto nuevo', variant: 'secondary' },
  PRODUCT_UPDATED: { label: 'Producto editado', variant: 'outline' },
  PRICE_CHANGED: { label: 'Cambio precio', variant: 'destructive' },
  STOCK_ADJUSTED: { label: 'Ajuste stock', variant: 'secondary' },
  DISCOUNT_APPLIED: { label: 'Descuento', variant: 'outline' },
}

const ENTITY_LABELS: Record<string, string> = {
  product: 'Producto',
  sale: 'Venta',
  user: 'Usuario',
  session: 'Sesión',
  system: 'Sistema',
}

const MAX_DIFF_CHARS = 200

function truncate(value: unknown): string {
  const raw = JSON.stringify(value ?? null)
  return raw.length > MAX_DIFF_CHARS ? `${raw.slice(0, MAX_DIFF_CHARS)}…` : raw
}

function DiffView({ oldValue, newValue }: { oldValue: Record<string, unknown> | null; newValue: Record<string, unknown> | null }) {
  if (!oldValue && !newValue) {
    return <p className="text-coffee-300 text-xs">Sin datos de cambio.</p>
  }

  const allKeys = new Set([
    ...Object.keys(oldValue ?? {}),
    ...Object.keys(newValue ?? {}),
  ])

  return (
    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
      <div>
        <p className="font-sans font-medium text-coffee-500 mb-1">Anterior</p>
        {oldValue ? (
          <div className="space-y-0.5">
            {[...allKeys].map((key) => {
              const oldVal = oldValue[key]
              const newVal = newValue?.[key]
              const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal)
              return (
                <div key={key} className={`break-all ${changed ? 'bg-red-50 px-1 rounded text-danger' : 'text-coffee-500 px-1'}`}>
                  {key}: {truncate(oldVal)}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-coffee-300">—</p>
        )}
      </div>
      <div>
        <p className="font-sans font-medium text-coffee-500 mb-1">Nuevo</p>
        {newValue ? (
          <div className="space-y-0.5">
            {[...allKeys].map((key) => {
              const oldVal = oldValue?.[key]
              const newVal = newValue[key]
              const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal)
              return (
                <div key={key} className={`break-all ${changed ? 'bg-green-50 px-1 rounded text-success' : 'text-coffee-500 px-1'}`}>
                  {key}: {truncate(newVal)}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-coffee-300">—</p>
        )}
      </div>
    </div>
  )
}

export default function AuditTable({
  data,
  totalCount,
  page,
  pageSize,
  loading,
  onPageChange,
}: AuditTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) {
    return <p className="text-coffee-300 text-sm py-8 text-center">Cargando registros...</p>
  }

  if (data.length === 0) {
    return <p className="text-coffee-300 text-sm py-8 text-center">No se encontraron registros.</p>
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((log) => {
            const isSuspicious = SUSPICIOUS_ACTIONS.has(log.action)
            const actionInfo = ACTION_LABELS[log.action] ?? { label: log.action, variant: 'outline' as const }
            const isExpanded = expandedId === log.id
            const hasDiff = log.old_value || log.new_value

            return (
              <Fragment key={log.id}>
                <TableRow
                  className={`cursor-pointer ${isSuspicious ? 'bg-warning/5' : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <TableCell className="w-8">
                    {hasDiff && (
                      isExpanded
                        ? <ChevronDown size={14} className="text-coffee-300" />
                        : <ChevronRight size={14} className="text-coffee-300" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{formatDateMX(log.created_at)}</TableCell>
                  <TableCell className="text-sm">{log.user_email}</TableCell>
                  <TableCell>
                    <Badge variant={actionInfo.variant} className="text-[10px]">
                      {actionInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                  </TableCell>
                  <TableCell className="text-sm text-coffee-500 font-mono">
                    {log.entity_id?.slice(0, 8)}
                  </TableCell>
                </TableRow>
                {isExpanded && hasDiff && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-cream/50 p-4">
                      <DiffView oldValue={log.old_value} newValue={log.new_value} />
                      {log.ip_address && (
                        <p className="text-xs text-coffee-300 mt-2">IP: {log.ip_address}</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
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
