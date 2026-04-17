import { useState, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'
import supabase from '../lib/supabaseClient'
import type { AuditLog } from '../types/database'
import AuditFilters, { type AuditFilterValues, EMPTY_FILTERS } from '../components/audit/AuditFilters'
import AuditTable from '../components/audit/AuditTable'

const PAGE_SIZE = 50

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AuditFilterValues>(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [exporting, setExporting] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)

    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
    if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
    if (filters.userId) query = query.eq('user_id', filters.userId)
    if (filters.action) query = query.eq('action', filters.action)
    if (filters.entityType) query = query.eq('entity_type', filters.entityType)

    const { data, count } = await query

    setLogs(data ?? [])
    setTotalCount(count ?? 0)
    setLoading(false)
  }, [filters, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('audit-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchLogs()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchLogs])

  const handleFilterChange = useCallback((newFilters: AuditFilterValues) => {
    setFilters(newFilters)
    setPage(0)
  }, [])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  async function handleExport() {
    setExporting(true)

    let query = supabase
      .from('audit_logs')
      .select('id, created_at, user_email, action, entity_type, entity_id')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
    if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
    if (filters.userId) query = query.eq('user_id', filters.userId)
    if (filters.action) query = query.eq('action', filters.action)
    if (filters.entityType) query = query.eq('entity_type', filters.entityType)

    const { data } = await query

    if (data && data.length > 0) {
      const headers = ['id', 'created_at', 'user_email', 'action', 'entity_type', 'entity_id']
      const rows = data.map((row) =>
        headers.map((h) => {
          const val = row[h as keyof typeof row]
          const str = String(val ?? '')
          return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str
        }).join(',')
      )
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
      a.href = url
      a.download = `auditoria-${today}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    setExporting(false)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <AuditFilters filters={filters} onChange={handleFilterChange} />
        <button
          onClick={handleExport}
          disabled={exporting || totalCount === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-coffee-800 text-white hover:bg-coffee-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Download size={16} />
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      {/* Summary */}
      <p className="text-xs text-coffee-400">
        {totalCount} registro{totalCount !== 1 ? 's' : ''}
        {totalPages > 1 && ` — Página ${page + 1} de ${totalPages}`}
      </p>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <AuditTable logs={logs} loading={loading} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg border border-coffee-200 hover:bg-coffee-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-coffee-600">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-coffee-200 hover:bg-coffee-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
