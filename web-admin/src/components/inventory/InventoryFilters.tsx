'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { QueryFilter } from '@/hooks/usePaginatedQuery'

interface InventoryFiltersProps {
  onFiltersChange: (filters: QueryFilter[]) => void
  onLowStockToggle: (active: boolean) => void
  lowStockActive: boolean
}

export default function InventoryFilters({
  onFiltersChange,
  onLowStockToggle,
  lowStockActive,
}: InventoryFiltersProps) {
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('products')
      .select('category')
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map((p: { category: string }) => p.category).filter(Boolean))]
        setCategories(unique.sort())
      })
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const filters: QueryFilter[] = []
      if (search) {
        filters.push({ column: 'name', op: 'ilike', value: `%${search}%` })
      }
      if (category) {
        filters.push({ column: 'category', op: 'eq', value: category })
      }
      if (statusFilter === 'active') {
        filters.push({ column: 'is_active', op: 'eq', value: true })
      } else if (statusFilter === 'inactive') {
        filters.push({ column: 'is_active', op: 'eq', value: false })
      }
      onFiltersChange(filters)
    }, 300)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, statusFilter])

  function clearFilters() {
    setSearch('')
    setCategory('')
    setStatusFilter('')
    onLowStockToggle(false)
  }

  const hasFilters = search || category || statusFilter || lowStockActive

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative">
        <label className="text-xs text-coffee-500 mb-1 block">Buscar</label>
        <Search size={14} className="absolute left-2.5 top-[calc(100%-10px)] -translate-y-1/2 text-coffee-300" />
        <Input
          type="text"
          placeholder="Nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 w-48"
        />
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Categoría</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900"
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-coffee-500 mb-1 block">Estado</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900"
        >
          <option value="">Todos</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>
      <Button
        variant={lowStockActive ? 'default' : 'outline'}
        size="sm"
        onClick={() => onLowStockToggle(!lowStockActive)}
      >
        Stock Bajo
      </Button>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X size={14} />
          Limpiar
        </Button>
      )}
    </div>
  )
}
