'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getMexicoDayStart, getMexicoDayEnd } from '@/lib/format'
import type { QueryFilter } from '@/hooks/usePaginatedQuery'
import type { Profile } from '@/types/database'

interface Props {
  onFiltersChange: (filters: QueryFilter[]) => void
}

const STATUSES = [
  { value: '', label: 'Todos' },
  { value: 'open', label: 'Abiertos' },
  { value: 'closed', label: 'Cerrados' },
]

export default function CortesFilters({ onFiltersChange }: Props) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [cashierId, setCashierId] = useState('')
  const [status, setStatus] = useState('')
  const [cashiers, setCashiers] = useState<Pick<Profile, 'id' | 'name' | 'email'>[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name')
      setCashiers(data ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    const filters: QueryFilter[] = []
    if (dateFrom) filters.push({ column: 'opened_at', op: 'gte', value: getMexicoDayStart(dateFrom) })
    if (dateTo) filters.push({ column: 'opened_at', op: 'lte', value: getMexicoDayEnd(dateTo) })
    if (cashierId) filters.push({ column: 'cashier_id', op: 'eq', value: cashierId })
    if (status) filters.push({ column: 'status', op: 'eq', value: status })
    onFiltersChange(filters)
  }, [dateFrom, dateTo, cashierId, status, onFiltersChange])

  const clear = () => {
    setDateFrom('')
    setDateTo('')
    setCashierId('')
    setStatus('')
  }

  const hasFilters = dateFrom || dateTo || cashierId || status

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-cream border border-coffee-100">
      <div>
        <label className="block text-xs text-coffee-600 mb-1">Desde</label>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
      </div>
      <div>
        <label className="block text-xs text-coffee-600 mb-1">Hasta</label>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
      </div>
      <div>
        <label className="block text-xs text-coffee-600 mb-1">Cajera</label>
        <select
          value={cashierId}
          onChange={(e) => setCashierId(e.target.value)}
          className="h-9 px-3 rounded-md border border-coffee-200 bg-white text-sm"
        >
          <option value="">Todas</option>
          {cashiers.map((c) => (
            <option key={c.id} value={c.id}>{c.name || c.email}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-coffee-600 mb-1">Estado</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 px-3 rounded-md border border-coffee-200 bg-white text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <X size={14} /> Limpiar
        </Button>
      )}
    </div>
  )
}
