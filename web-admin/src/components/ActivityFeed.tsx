'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateMX } from '@/lib/format'
import type { AuditLog } from '@/types/database'

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  LOGIN: { label: 'Inicio sesión', variant: 'secondary' },
  LOGOUT: { label: 'Cierre sesión', variant: 'outline' },
  SALE_COMPLETED: { label: 'Venta', variant: 'default' },
  SALE_CANCELLED: { label: 'Cancelación', variant: 'destructive' },
  SALE_REFUNDED: { label: 'Reembolso', variant: 'destructive' },
  PRODUCT_CREATED: { label: 'Producto nuevo', variant: 'secondary' },
  PRODUCT_UPDATED: { label: 'Producto editado', variant: 'outline' },
  PRICE_CHANGED: { label: 'Cambio precio', variant: 'destructive' },
  STOCK_ADJUSTED: { label: 'Ajuste stock', variant: 'secondary' },
  DISCOUNT_APPLIED: { label: 'Descuento', variant: 'outline' },
}

function getActionInfo(action: string) {
  return ACTION_LABELS[action] ?? { label: action, variant: 'outline' as const }
}

export default function ActivityFeed() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchLogs() {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      setLogs(data ?? [])
      setLoading(false)
    }

    fetchLogs()

    const channel = supabase
      .channel('admin-audit-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setLogs((prev) =>
            [payload.new as AuditLog, ...prev].slice(0, 20)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Activity size={16} className="text-coffee-500" />
        <CardTitle className="text-sm font-medium text-coffee-500">
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-coffee-300 text-sm">Cargando...</p>
        ) : logs.length === 0 ? (
          <p className="text-coffee-300 text-sm">Sin actividad registrada.</p>
        ) : (
          <ul className="space-y-3 max-h-[400px] overflow-y-auto">
            {logs.map((log) => {
              const info = getActionInfo(log.action)
              return (
                <li
                  key={log.id}
                  className="flex items-start justify-between gap-2 text-sm py-2 border-b border-coffee-100 last:border-0"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={info.variant} className="text-[10px] shrink-0">
                        {info.label}
                      </Badge>
                      <span className="text-coffee-900 truncate">
                        {log.user_email}
                      </span>
                    </div>
                    <p className="text-coffee-300 text-xs">
                      {log.entity_type} • {log.entity_id?.slice(0, 8)}
                    </p>
                  </div>
                  <span className="text-coffee-300 text-xs whitespace-nowrap shrink-0">
                    {formatDateMX(log.created_at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
