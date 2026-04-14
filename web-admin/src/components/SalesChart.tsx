'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { get30DaysAgoISO, formatMXN, formatDayLabel } from '@/lib/format'

interface DayData {
  day: string
  label: string
  revenue: number
  count: number
}

function aggregateSalesByDay(
  sales: Array<{ total: number; created_at: string }>
): DayData[] {
  const byDay: Record<string, { revenue: number; count: number }> = {}

  sales.forEach((sale) => {
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(sale.created_at))

    if (!byDay[day]) byDay[day] = { revenue: 0, count: 0 }
    byDay[day].revenue += Number(sale.total)
    byDay[day].count += 1
  })

  const result: DayData[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
    result.push({
      day: dayStr,
      label: formatDayLabel(dayStr),
      revenue: byDay[dayStr]?.revenue ?? 0,
      count: byDay[dayStr]?.count ?? 0,
    })
  }

  return result
}

export default function SalesChart() {
  const [data, setData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchChartData() {
      const since = get30DaysAgoISO()

      const { data: sales } = await supabase
        .from('sales')
        .select('total, created_at')
        .eq('status', 'completed')
        .gte('created_at', since)
        .order('created_at', { ascending: true })

      setData(aggregateSalesByDay(sales ?? []))
      setLoading(false)
    }

    fetchChartData()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-coffee-500">
          Ventas — Últimos 30 días
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-coffee-300">
            Cargando gráfica...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D7CCC8" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#795548' }}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#795548' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [formatMXN(Number(value ?? 0)), 'Ingresos']}
                labelFormatter={(label) => `Día: ${label}`}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #D7CCC8',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#5D4037"
                fill="#D7CCC8"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
