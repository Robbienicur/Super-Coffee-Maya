'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface QueryFilter {
  column: string
  op: 'eq' | 'neq' | 'gte' | 'lte' | 'ilike' | 'is' | 'or'
  value: string | number | boolean | null
}

interface UsePaginatedQueryOptions {
  table: string
  select: string
  filters?: QueryFilter[]
  orderBy?: { column: string; ascending: boolean }
  pageSize?: number
}

interface UsePaginatedQueryResult<T> {
  data: T[]
  totalCount: number
  page: number
  setPage: (page: number) => void
  loading: boolean
  refetch: () => void
}

export function usePaginatedQuery<T = Record<string, unknown>>({
  table,
  select,
  filters = [],
  orderBy = { column: 'created_at', ascending: false },
  pageSize = 25,
}: UsePaginatedQueryOptions): UsePaginatedQueryResult<T> {
  const [data, setData] = useState<T[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => setTrigger((t) => t + 1), [])

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])
  const orderByColumn = orderBy.column
  const orderByAscending = orderBy.ascending

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [filtersKey])

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    setLoading(true)

    async function fetchData() {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from(table)
        .select(select, { count: 'exact' })

      const parsedFilters: QueryFilter[] = JSON.parse(filtersKey)

      for (const f of parsedFilters) {
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
          case 'or':
            // Para este op, `column` es ignorado y `value` es la expresión PostgREST
            // (ej. "name.ilike.%x%,barcode.ilike.%x%").
            query = query.or(f.value as string)
            break
        }
      }

      query = query
        .order(orderByColumn, { ascending: orderByAscending })
        .range(from, to)

      const { data: rows, count } = await query

      if (!cancelled) {
        setData((rows as T[]) ?? [])
        setTotalCount(count ?? 0)
        setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [table, select, filtersKey, orderByColumn, orderByAscending, page, pageSize, trigger])

  return { data, totalCount, page, setPage, loading, refetch }
}
