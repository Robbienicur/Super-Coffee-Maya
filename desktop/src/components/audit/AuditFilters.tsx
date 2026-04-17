import { useEffect, useState } from 'react'
import supabase from '../../lib/supabaseClient'
import type { Profile } from '../../types/database'

export interface AuditFilterValues {
  dateFrom: string
  dateTo: string
  userId: string
  action: string
  entityType: string
}

export const EMPTY_FILTERS: AuditFilterValues = {
  dateFrom: '',
  dateTo: '',
  userId: '',
  action: '',
  entityType: '',
}

interface AuditFiltersProps {
  filters: AuditFilterValues
  onChange: (filters: AuditFilterValues) => void
}

const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'LOGIN', label: 'Inicio de sesión' },
  { value: 'LOGOUT', label: 'Cierre de sesión' },
  { value: 'SALE_COMPLETED', label: 'Venta completada' },
  { value: 'SALE_CANCELLED', label: 'Venta cancelada' },
  { value: 'SALE_REFUNDED', label: 'Venta reembolsada' },
  { value: 'PRODUCT_CREATED', label: 'Producto creado' },
  { value: 'PRODUCT_UPDATED', label: 'Producto actualizado' },
  { value: 'PRICE_CHANGED', label: 'Precio cambiado' },
  { value: 'STOCK_ADJUSTED', label: 'Stock ajustado' },
  { value: 'USER_CREATED', label: 'Usuario creado' },
  { value: 'ROLE_CHANGED', label: 'Rol cambiado' },
  { value: 'USER_DEACTIVATED', label: 'Usuario desactivado' },
  { value: 'USER_ACTIVATED', label: 'Usuario activado' },
  { value: 'DISCOUNT_APPLIED', label: 'Descuento aplicado' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Todas las entidades' },
  { value: 'product', label: 'Producto' },
  { value: 'sale', label: 'Venta' },
  { value: 'user', label: 'Usuario' },
  { value: 'session', label: 'Sesión' },
  { value: 'system', label: 'Sistema' },
]

export default function AuditFilters({ filters, onChange }: AuditFiltersProps) {
  const [users, setUsers] = useState<Pick<Profile, 'id' | 'email' | 'name'>[]>([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name, email')
      .order('email')
      .then(({ data }) => {
        if (data) setUsers(data)
      })
  }, [])

  const hasFilters = filters.dateFrom || filters.dateTo || filters.userId || filters.action || filters.entityType

  const selectClass =
    'text-sm rounded-lg border border-coffee-200 bg-white text-coffee-900 px-3 py-1.5 outline-none focus:ring-2 focus:ring-coffee-500 cursor-pointer'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-coffee-500 whitespace-nowrap">Desde</label>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          className={selectClass}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-coffee-500 whitespace-nowrap">Hasta</label>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          className={selectClass}
        />
      </div>

      <select
        value={filters.userId}
        onChange={(e) => onChange({ ...filters, userId: e.target.value })}
        className={selectClass}
      >
        <option value="">Todos los usuarios</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name || u.email}</option>
        ))}
      </select>

      <select
        value={filters.action}
        onChange={(e) => onChange({ ...filters, action: e.target.value })}
        className={selectClass}
      >
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.entityType}
        onChange={(e) => onChange({ ...filters, entityType: e.target.value })}
        className={selectClass}
      >
        {ENTITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-xs text-coffee-500 hover:text-coffee-700 underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
