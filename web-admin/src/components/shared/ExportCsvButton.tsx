'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { QueryFilter } from '@/hooks/usePaginatedQuery'

interface CsvColumn {
  key: string
  label: string
  getValue?: (row: Record<string, unknown>) => string
}

interface ExportCsvButtonProps {
  table: string
  select: string
  filters: QueryFilter[]
  orderBy?: { column: string; ascending: boolean }
  filename: string
  columns: CsvColumn[]
  batchSize?: number
  maxRows?: number
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: QueryFilter[]): any {
  let q = query
  for (const f of filters) {
    switch (f.op) {
      case 'eq':
        q = q.eq(f.column, f.value)
        break
      case 'neq':
        q = q.neq(f.column, f.value)
        break
      case 'gte':
        q = q.gte(f.column, f.value)
        break
      case 'lte':
        q = q.lte(f.column, f.value)
        break
      case 'ilike':
        q = q.ilike(f.column, f.value as string)
        break
      case 'is':
        q = q.is(f.column, f.value)
        break
      case 'or':
        q = q.or(f.value as string)
        break
    }
  }
  return q
}

export default function ExportCsvButton({
  table,
  select,
  filters,
  orderBy = { column: 'created_at', ascending: false },
  filename,
  columns,
  batchSize = 1000,
  maxRows = 50000,
}: ExportCsvButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    const supabase = createClient()

    const countQuery = applyFilters(
      supabase.from(table).select(select, { count: 'exact', head: true }),
      filters
    )
    const { count } = await countQuery
    const total: number = count ?? 0

    if (total === 0) {
      setLoading(false)
      alert('No hay filas para exportar con los filtros actuales.')
      return
    }

    const willTruncate = total > maxRows
    if (willTruncate) {
      const ok = confirm(
        `Hay ${total.toLocaleString('es-MX')} filas. Sólo se exportarán las primeras ${maxRows.toLocaleString('es-MX')}. ¿Continuar?`
      )
      if (!ok) {
        setLoading(false)
        return
      }
    }

    const target = Math.min(total, maxRows)
    const rows: Record<string, unknown>[] = []

    for (let from = 0; from < target; from += batchSize) {
      const to = Math.min(from + batchSize - 1, target - 1)
      const batchQuery = applyFilters(
        supabase.from(table).select(select),
        filters
      )
        .order(orderBy.column, { ascending: orderBy.ascending })
        .range(from, to)
      const { data, error } = await batchQuery
      if (error || !data) break
      const batch = data as Record<string, unknown>[]
      rows.push(...batch)
      if (batch.length < batchSize) break
    }

    if (rows.length === 0) {
      setLoading(false)
      return
    }

    const header = columns.map((c) => escapeCsv(c.label)).join(',')
    const csvRows = rows.map((row) =>
      columns
        .map((c) => {
          const val = c.getValue
            ? c.getValue(row)
            : String(row[c.key] ?? '')
          return escapeCsv(val)
        })
        .join(',')
    )
    const bom = '\uFEFF'
    const csv = bom + [header, ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)

    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
    >
      <Download size={16} />
      {loading ? 'Exportando...' : 'Exportar CSV'}
    </Button>
  )
}
