'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, ShoppingCart, TrendingUp, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatMXN, getTodayStartISO } from '@/lib/format'
import type { Sale, SaleItem } from '@/types/database'

interface SummaryData {
  salesCount: number
  revenue: number
  avgTicket: number
  bestSeller: string
}

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

    async function fetchSummary() {
      const todayStart = getTodayStartISO()

      const { data: salesRaw } = await supabase
        .from('sales')
        .select('id, total')
        .eq('status', 'completed')
        .gte('created_at', todayStart)

      const sales = salesRaw as Pick<Sale, 'id' | 'total'>[] | null
      const salesCount = sales?.length ?? 0
      const revenue = sales?.reduce((sum, s) => sum + Number(s.total), 0) ?? 0
      const avgTicket = salesCount > 0 ? revenue / salesCount : 0

      let bestSeller = '—'
      if (sales && sales.length > 0) {
        const saleIds = sales.map((s) => s.id)
        const { data: itemsRaw } = await supabase
          .from('sale_items')
          .select('quantity, product_id, products(name)')
          .in('sale_id', saleIds)

        type ItemRow = Pick<SaleItem, 'quantity' | 'product_id'> & { products: { name: string } | null }
        const items = itemsRaw as ItemRow[] | null

        const productCounts: Record<string, { name: string; qty: number }> = {}
        items?.forEach((item) => {
          const name = item.products?.name ?? 'Desconocido'
          const key = item.product_id
          if (!productCounts[key]) productCounts[key] = { name, qty: 0 }
          productCounts[key].qty += item.quantity
        })
        bestSeller =
          Object.values(productCounts).sort((a, b) => b.qty - a.qty)[0]
            ?.name ?? '—'
      }

      setData({ salesCount, revenue, avgTicket, bestSeller })
      setLoading(false)
    }

    fetchSummary()
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
