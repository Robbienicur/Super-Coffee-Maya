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
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export default function ExportCsvButton({
  table,
  select,
  filters,
  orderBy = { column: 'created_at', ascending: false },
  filename,
  columns,
}: ExportCsvButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    const supabase = createClient()

    let query = supabase.from(table).select(select)

    for (const f of filters) {
      switch (f.op) {
        case 'eq':
          query = query.eq(f.column, f.value as string | number | boolean)
          break
        case 'neq':
          query = query.neq(f.column, f.value as string | number | boolean)
          break
        case 'gte':
          query = query.gte(f.column, f.value!)
          break
        case 'lte':
          query = query.lte(f.column, f.value!)
          break
        case 'ilike':
          query = query.ilike(f.column, f.value as string)
          break
        case 'is':
          query = query.is(f.column, f.value as null)
          break
      }
    }

    const { data } = await query.order(orderBy.column, {
      ascending: orderBy.ascending,
    })

    if (data && data.length > 0) {
      const header = columns.map((c) => escapeCsv(c.label)).join(',')
      const rows = data.map((row) =>
        columns
          .map((c) => {
            const val = c.getValue
              ? c.getValue(row as Record<string, unknown>)
              : String((row as Record<string, unknown>)[c.key] ?? '')
            return escapeCsv(val)
          })
          .join(',')
      )
      const bom = '\uFEFF'
      const csv = bom + [header, ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

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
