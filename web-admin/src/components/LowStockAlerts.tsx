'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types/database'

export default function LowStockAlerts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchLowStock() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('stock', { ascending: true })

      const products = data as Product[] | null
      const lowStock = (products ?? []).filter((p) => p.stock <= p.min_stock)
      setProducts(lowStock)
      setLoading(false)
    }

    fetchLowStock()

    const channel = supabase
      .channel('admin-low-stock')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchLowStock()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-coffee-500">
          Alertas de Stock Bajo
        </CardTitle>
        {products.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {products.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-coffee-300 text-sm">Cargando...</p>
        ) : products.length === 0 ? (
          <p className="text-coffee-300 text-sm">
            Todos los productos tienen stock suficiente.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[280px] overflow-y-auto">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-sm py-2 border-b border-coffee-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    size={14}
                    className={
                      p.stock === 0 ? 'text-danger' : 'text-warning'
                    }
                  />
                  <span className="text-coffee-900">{p.name}</span>
                </div>
                <span
                  className={`font-medium ${
                    p.stock === 0 ? 'text-danger' : 'text-warning'
                  }`}
                >
                  {p.stock} / {p.min_stock}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
