'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { insertAuditLog } from '@/lib/auditLog'
import { formatMXN, formatDateMX } from '@/lib/format'
import type { Sale, SaleItem } from '@/types/database'

type SaleWithCashier = Sale & {
  profiles: { name: string; email: string } | null
}

type SaleItemWithProduct = SaleItem & {
  products: { name: string } | null
}

interface SaleDetailModalProps {
  sale: SaleWithCashier | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

export default function SaleDetailModal({
  sale,
  open,
  onClose,
  onUpdated,
}: SaleDetailModalProps) {
  const [items, setItems] = useState<SaleItemWithProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!sale || !open) return
    setLoading(true)
    const supabase = createClient()

    supabase
      .from('sale_items')
      .select('*, products(name)')
      .eq('sale_id', sale.id)
      .order('created_at')
      .then(({ data }) => {
        setItems((data as SaleItemWithProduct[]) ?? [])
        setLoading(false)
      })
  }, [sale, open])

  async function handleChangeStatus(newStatus: 'cancelled' | 'refunded') {
    if (!sale) return
    setActionLoading(true)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('sales')
      .update({ status: newStatus })
      .eq('id', sale.id)

    if (!error) {
      const actionName = newStatus === 'cancelled' ? 'SALE_CANCELLED' : 'SALE_REFUNDED'
      await insertAuditLog(actionName, 'sale', sale.id, { status: sale.status }, { status: newStatus })
      onUpdated()
      onClose()
    }

    setActionLoading(false)
  }

  if (!sale) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de Venta</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-coffee-500">Cajero:</span>{' '}
            <span className="text-coffee-900 font-medium">
              {sale.profiles?.name || sale.profiles?.email || '—'}
            </span>
          </div>
          <div>
            <span className="text-coffee-500">Fecha:</span>{' '}
            <span className="text-coffee-900">{formatDateMX(sale.created_at)}</span>
          </div>
          <div>
            <span className="text-coffee-500">Método:</span>{' '}
            <span className="text-coffee-900">{PAYMENT_LABEL[sale.payment_method]}</span>
          </div>
          <div>
            <span className="text-coffee-500">Total:</span>{' '}
            <span className="text-coffee-900 font-bold">{formatMXN(sale.total)}</span>
          </div>
          {sale.discount_amount > 0 && (
            <div>
              <span className="text-coffee-500">Descuento:</span>{' '}
              <span className="text-coffee-900">{formatMXN(sale.discount_amount)}</span>
            </div>
          )}
          {sale.notes && (
            <div className="col-span-2">
              <span className="text-coffee-500">Notas:</span>{' '}
              <span className="text-coffee-900">{sale.notes}</span>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-coffee-300 text-sm">Cargando items...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">P. Unitario</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">
                    {item.products?.name ?? 'Producto eliminado'}
                  </TableCell>
                  <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatMXN(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatMXN(item.subtotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {sale.status === 'completed' && (
          <div className="flex justify-end gap-2 pt-4 border-t border-coffee-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChangeStatus('refunded')}
              disabled={actionLoading}
            >
              {actionLoading ? 'Procesando...' : 'Reembolsar'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleChangeStatus('cancelled')}
              disabled={actionLoading}
            >
              {actionLoading ? 'Procesando...' : 'Cancelar Venta'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
