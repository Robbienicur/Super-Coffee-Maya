'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { QueryFilter } from '@/hooks/usePaginatedQuery'
import type { Profile } from '@/types/database'

interface AuditFiltersProps {
  onFiltersChange: (filters: QueryFilter[]) => void
}

const ACTIONS = [
  { value: '', label: 'Todas' },
  { value: 'LOGIN', label: 'Inicio sesión' },
  { value: 'LOGOUT', label: 'Cierre sesión' },
  { value: 'SALE_COMPLETED', label: 'Venta completada' },
  { value: 'SALE_CANCELLED', label: 'Venta cancelada' },
  { value: 'SALE_REFUNDED', label: 'Venta reembolsada' },
  { value: 'PRODUCT_CREATED', label: 'Producto creado' },
  { value: 'PRODUCT_UPDATED', label: 'Producto editado' },
  { value: 'PRICE_CHANGED', label: 'Cambio de precio' },
  { value: 'STOCK_ADJUSTED', label: 'Ajuste de stock' },
  { value: 'DISCOUNT_APPLIED', label: 'Descuento aplicado' },
]

const ENTITY_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'product', label: 'Producto' },
  { value: 'sale', label: 'Venta' },
  { value: 'user', label: 'Usuario' },
  { value: 'session', label: 'Sesión' },
  { value: 'system', label: 'Sistema' },
]

export default function AuditFilters({ onFiltersChange }: AuditFiltersProps) {
  const [users, setUsers] = useState<Profile[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, name, email, role')
      .order('name')
      .then(({ data }) => {
        setUsers((data as Profile[]) ?? [])
      })
  }, [])

  useEffect(() => {
    const filters: QueryFilter[] = []
    if (dateFrom) filters.push({ column: 'created_at', op: 'gte', value: `${dateFrom}T00:00:00` })
    if (dateTo) filters.push({ column: 'created_at', op: 'lte', value: `${dateTo}T23:59:59` })
    if (userId) filters.push({ column: 'user_id', op: 'eq', value: userId })
    if (action) filters.push({ column: 'action', op: 'eq', value: action })
    if (entityType) filters.push({ column: 'entity_type', op: 'eq', value: entityType })
    onFiltersChange(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, userId, action, entityType])

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setUserId('')
    setAction('')
    setEntityType('')
  }

  const hasFilters = dateFrom || dateTo || userId || action || entityType

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Desde</label>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Hasta</label>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Usuario</label>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900">
          <option value="">Todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name || u.email}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Acción</label>
        <select value={action} onChange={(e) => setAction(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900">
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Entidad</label>
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900">
          {ENTITY_TYPES.map((et) => (
            <option key={et.value} value={et.value}>{et.label}</option>
          ))}
        </select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X size={14} />
          Limpiar
        </Button>
      )}
    </div>
  )
}
