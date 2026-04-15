'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { QueryFilter } from '@/hooks/usePaginatedQuery'
import type { Profile } from '@/types/database'

interface SalesFiltersProps {
  onFiltersChange: (filters: QueryFilter[]) => void
}

const PAYMENT_METHODS = [
  { value: '', label: 'Todos' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
]

const STATUSES = [
  { value: '', label: 'Todos' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'refunded', label: 'Reembolsada' },
]

export default function SalesFilters({ onFiltersChange }: SalesFiltersProps) {
  const [cashiers, setCashiers] = useState<Profile[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [cashierId, setCashierId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, name, email, role')
      .order('name')
      .then(({ data }) => {
        setCashiers((data as Profile[]) ?? [])
      })
  }, [])

  useEffect(() => {
    const filters: QueryFilter[] = []
    if (dateFrom) filters.push({ column: 'created_at', op: 'gte', value: `${dateFrom}T00:00:00` })
    if (dateTo) filters.push({ column: 'created_at', op: 'lte', value: `${dateTo}T23:59:59` })
    if (cashierId) filters.push({ column: 'cashier_id', op: 'eq', value: cashierId })
    if (paymentMethod) filters.push({ column: 'payment_method', op: 'eq', value: paymentMethod })
    if (status) filters.push({ column: 'status', op: 'eq', value: status })
    onFiltersChange(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, cashierId, paymentMethod, status])

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setCashierId('')
    setPaymentMethod('')
    setStatus('')
  }

  const hasFilters = dateFrom || dateTo || cashierId || paymentMethod || status

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Desde</label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36"
        />
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Hasta</label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36"
        />
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Cajero</label>
        <select
          value={cashierId}
          onChange={(e) => setCashierId(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900"
        >
          <option value="">Todos</option>
          {cashiers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Método</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Estado</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
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
