'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'
import { usePaginatedQuery, type QueryFilter } from '@/hooks/usePaginatedQuery'
import { formatDateMX } from '@/lib/format'
import AuditFilters from '@/components/audit/AuditFilters'
import AuditTable from '@/components/audit/AuditTable'
import ExportCsvButton from '@/components/shared/ExportCsvButton'
import type { AuditLog } from '@/types/database'

const PAGE_SIZE = 50

export default function AuditoriaPage() {
  const [filters, setFilters] = useState<QueryFilter[]>([])

  const { data, totalCount, page, setPage, loading } =
    usePaginatedQuery<AuditLog>({
      table: 'audit_logs',
      select: '*',
      filters,
      orderBy: { column: 'created_at', ascending: false },
      pageSize: PAGE_SIZE,
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-coffee-900">Auditoría</h1>
        <ExportCsvButton
          table="audit_logs"
          select="id, user_email, action, entity_type, entity_id, created_at"
          filters={filters}
          filename={`auditoria-${new Date().toISOString().slice(0, 10)}`}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'created_at', label: 'Fecha', getValue: (r) => formatDateMX(r.created_at as string) },
            { key: 'user_email', label: 'Usuario' },
            { key: 'action', label: 'Acción' },
            { key: 'entity_type', label: 'Entidad' },
            { key: 'entity_id', label: 'ID Entidad' },
          ]}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <FileText size={16} className="text-coffee-500" />
          <CardTitle className="text-sm font-medium text-coffee-500">
            Registros de Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuditFilters onFiltersChange={setFilters} />
          <AuditTable
            data={data}
            totalCount={totalCount}
            page={page}
            pageSize={PAGE_SIZE}
            loading={loading}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
