'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, ShoppingCart, TrendingUp, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatMXN, getTodayStartISO } from '@/lib/format'
import type { Sale } from '@/types/database'

interface SummaryData {
  salesCount: number
  revenue: number
  avgTicket: number
  bestSeller: string
}

const REFRESH_MS = 60_000

export default function SummaryCards() {
  const [data, setData] = useState<SummaryData>({
    salesCount: 0,
    revenue: 0,
    avgTicket: 0,
    bestSeller: '—',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function fetchSummary() {
      const todayStart = getTodayStartISO()

      const [{ data: salesRaw }, { data: bestRaw }] = await Promise.all([
        supabase
          .from('sales')
          .select('id, total')
          .eq('status', 'completed')
          .gte('created_at', todayStart),
        supabase.rpc('get_today_best_seller'),
      ])

      const sales = salesRaw as Pick<Sale, 'id' | 'total'>[] | null
      const salesCount = sales?.length ?? 0
      const revenue = sales?.reduce((sum, s) => sum + Number(s.total), 0) ?? 0
      const avgTicket = salesCount > 0 ? revenue / salesCount : 0

      const bestRow = (bestRaw as { name: string }[] | null)?.[0]
      const bestSeller = bestRow?.name ?? '—'

      if (!cancelled) {
        setData({ salesCount, revenue, avgTicket, bestSeller })
        setLoading(false)
      }
    }

    fetchSummary()
    const interval = setInterval(fetchSummary, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const cards = [
    {
      title: 'Ventas Hoy',
      value: loading ? '...' : String(data.salesCount),
      icon: ShoppingCart,
      color: 'text-info',
    },
    {
      title: 'Ingresos Hoy',
      value: loading ? '...' : formatMXN(data.revenue),
      icon: DollarSign,
      color: 'text-success',
    },
    {
      title: 'Ticket Promedio',
      value: loading ? '...' : formatMXN(data.avgTicket),
      icon: TrendingUp,
      color: 'text-warning',
    },
    {
      title: 'Más Vendido',
      value: loading ? '...' : data.bestSeller,
      icon: Star,
      color: 'text-coffee-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-coffee-500">
              {card.title}
            </CardTitle>
            <card.icon size={20} className={card.color} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-coffee-900 truncate">
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
