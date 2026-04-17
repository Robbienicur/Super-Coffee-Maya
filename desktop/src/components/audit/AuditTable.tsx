import { Fragment, useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { AuditLog } from '../../types/database'

interface AuditTableProps {
  logs: AuditLog[]
  loading: boolean
}

const SUSPICIOUS_ACTIONS = new Set([
  'SALE_CANCELLED',
  'SALE_REFUNDED',
  'PRICE_CHANGED',
  'STOCK_ADJUSTED',
  'ROLE_CHANGED',
])

const ACTION_STYLES: Record<string, string> = {
  LOGIN: 'bg-coffee-100 text-coffee-600',
  LOGOUT: 'bg-coffee-100 text-coffee-500',
  SALE_COMPLETED: 'bg-green-100 text-green-700',
  SALE_CANCELLED: 'bg-red-100 text-red-700',
  SALE_REFUNDED: 'bg-red-100 text-red-700',
  PRODUCT_CREATED: 'bg-blue-100 text-blue-700',
  PRODUCT_UPDATED: 'bg-blue-100 text-blue-700',
  PRICE_CHANGED: 'bg-red-100 text-red-700',
  STOCK_ADJUSTED: 'bg-red-100 text-red-700',
  DISCOUNT_APPLIED: 'bg-coffee-100 text-coffee-600',
  USER_CREATED: 'bg-blue-100 text-blue-700',
  ROLE_CHANGED: 'bg-amber-100 text-amber-700',
  USER_DEACTIVATED: 'bg-red-100 text-red-700',
  USER_ACTIVATED: 'bg-green-100 text-green-700',
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Inicio sesión',
  LOGOUT: 'Cierre sesión',
  SALE_COMPLETED: 'Venta completada',
  SALE_CANCELLED: 'Venta cancelada',
  SALE_REFUNDED: 'Venta reembolsada',
  PRODUCT_CREATED: 'Producto creado',
  PRODUCT_UPDATED: 'Producto actualizado',
  PRICE_CHANGED: 'Precio cambiado',
  STOCK_ADJUSTED: 'Stock ajustado',
  DISCOUNT_APPLIED: 'Descuento aplicado',
  USER_CREATED: 'Usuario creado',
  ROLE_CHANGED: 'Rol cambiado',
  USER_DEACTIVATED: 'Usuario desactivado',
  USER_ACTIVATED: 'Usuario activado',
}

const ENTITY_LABELS: Record<string, string> = {
  product: 'Producto',
  sale: 'Venta',
  user: 'Usuario',
  session: 'Sesión',
  system: 'Sistema',
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DiffView({ oldVal, newVal }: { oldVal: Record<string, unknown> | null; newVal: Record<string, unknown> | null }) {
  if (!oldVal && !newVal) return null

  const allKeys = Array.from(new Set([
    ...Object.keys(oldVal ?? {}),
    ...Object.keys(newVal ?? {}),
  ]))

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-semibold text-coffee-500 mb-2">Anterior</p>
        {oldVal ? (
          <div className="space-y-1">
            {allKeys.map((key) => {
              const old = oldVal[key]
              const nw = newVal?.[key]
              const changed = JSON.stringify(old) !== JSON.stringify(nw)
              return (
                <div key={key} className={`text-xs font-mono px-2 py-1 rounded ${changed ? 'bg-red-50 text-red-700' : 'text-coffee-400'}`}>
                  <span className="font-semibold">{key}:</span> {old !== undefined ? JSON.stringify(old) : '—'}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-coffee-300 italic">Sin datos</p>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-coffee-500 mb-2">Nuevo</p>
        {newVal ? (
          <div className="space-y-1">
            {allKeys.map((key) => {
              const old = oldVal?.[key]
              const nw = newVal[key]
              const changed = JSON.stringify(old) !== JSON.stringify(nw)
              return (
                <div key={key} className={`text-xs font-mono px-2 py-1 rounded ${changed ? 'bg-green-50 text-green-700' : 'text-coffee-400'}`}>
                  <span className="font-semibold">{key}:</span> {nw !== undefined ? JSON.stringify(nw) : '—'}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-coffee-300 italic">Sin datos</p>
        )}
      </div>
    </div>
  )
}

export default function AuditTable({ logs, loading }: AuditTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-coffee-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-coffee-300 text-sm">
        No se encontraron registros
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-coffee-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-coffee-900 text-coffee-100 text-left">
            <th className="w-8 px-2 py-3" />
            <th className="px-4 py-3 font-semibold">Fecha</th>
            <th className="px-4 py-3 font-semibold">Usuario</th>
            <th className="px-4 py-3 font-semibold">Acción</th>
            <th className="px-4 py-3 font-semibold">Entidad</th>
            <th className="px-4 py-3 font-semibold">ID</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const isExpanded = expandedId === log.id
            const isSuspicious = SUSPICIOUS_ACTIONS.has(log.action)
            const hasDiff = log.old_value || log.new_value

            return (
              <Fragment key={log.id}>
                <tr
                  onClick={() => hasDiff && setExpandedId(isExpanded ? null : log.id)}
                  className={`border-t border-coffee-100 transition-colors ${
                    isSuspicious ? 'bg-amber-50' : 'bg-white'
                  } ${hasDiff ? 'cursor-pointer hover:bg-coffee-100/50' : ''} ${
                    isExpanded ? '!bg-coffee-100' : ''
                  }`}
                >
                  <td className="px-2 py-3 text-coffee-400">
                    {hasDiff && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                  </td>
                  <td className="px-4 py-3 text-coffee-700 whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3 text-coffee-700 truncate max-w-[200px]">
                    {log.user_email}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_STYLES[log.action] ?? 'bg-coffee-100 text-coffee-600'}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-coffee-700">
                    {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-coffee-500">
                    {log.entity_id.slice(0, 8)}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-t border-coffee-100 bg-coffee-100">
                    <td colSpan={6} className="px-6 py-4">
                      <DiffView oldVal={log.old_value} newVal={log.new_value} />
                      {log.ip_address && (
                        <p className="text-xs text-coffee-400 mt-3">IP: {log.ip_address}</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
