import { useEffect, useState } from 'react'
import supabase from '../../lib/supabaseClient'
import type { Sale, AuditLog } from '../../types/database'

interface SaleDetailProps {
  sale: Sale & { cashier_name?: string; cashier_email?: string }
}

interface SaleItemWithProduct {
  id: string
  quantity: number
  unit_price: number
  subtotal: number
  products: { name: string } | null
}

const formatMXN = (amount: number) =>
  amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

export default function SaleDetail({ sale }: SaleDetailProps) {
  const [items, setItems] = useState<SaleItemWithProduct[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditLog[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadingAudit, setLoadingAudit] = useState(true)

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from('sale_items')
        .select('id, quantity, unit_price, subtotal, products(name)')
        .eq('sale_id', sale.id)
        .order('id')

      setItems((data ?? []) as unknown as SaleItemWithProduct[])
      setLoadingItems(false)
    }

    fetchItems()
  }, [sale.id])

  useEffect(() => {
    if (sale.status !== 'cancelled' && sale.status !== 'refunded') {
      setLoadingAudit(false)
      return
    }

    const fetchAudit = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'sale')
        .eq('entity_id', sale.id)
        .in('action', ['SALE_CANCELLED', 'SALE_REFUNDED'])
        .order('created_at')

      setAuditEvents(data ?? [])
      setLoadingAudit(false)
    }

    fetchAudit()
  }, [sale.id, sale.status])

  return (
    <div className="bg-cream-dark px-6 py-4 space-y-5">
      {/* Items */}
      <div>
        <h4 className="text-xs font-semibold text-coffee-500 uppercase tracking-wide mb-2">
          Productos
        </h4>
        {loadingItems ? (
          <p className="text-sm text-coffee-300">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-coffee-300">Sin productos registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-coffee-400 border-b border-coffee-200">
                <th className="text-left py-1 font-medium">Producto</th>
                <th className="text-center py-1 font-medium">Cant.</th>
                <th className="text-right py-1 font-medium">P. Unit.</th>
                <th className="text-right py-1 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-coffee-100 last:border-0">
                  <td className="py-1.5 text-coffee-800">
                    {(item.products as unknown as { name: string })?.name ?? 'Producto eliminado'}
                  </td>
                  <td className="py-1.5 text-center text-coffee-700">{item.quantity}</td>
                  <td className="py-1.5 text-right text-coffee-700">{formatMXN(item.unit_price)}</td>
                  <td className="py-1.5 text-right font-medium text-coffee-900">
                    {formatMXN(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Data */}
      <div>
        <h4 className="text-xs font-semibold text-coffee-500 uppercase tracking-wide mb-2">
          Datos de pago
        </h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <span className="text-coffee-400">Método de pago</span>
          <span className="text-coffee-800 font-medium">
            {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
          </span>

          <span className="text-coffee-400">Monto pagado</span>
          <span className="text-coffee-800">{formatMXN(sale.amount_paid)}</span>

          <span className="text-coffee-400">Cambio</span>
          <span className="text-coffee-800">{formatMXN(sale.change_given)}</span>

          {sale.discount_amount > 0 && (
            <>
              <span className="text-coffee-400">Descuento</span>
              <span className="text-amber-700">{formatMXN(sale.discount_amount)}</span>
            </>
          )}

          {sale.notes && (
            <>
              <span className="text-coffee-400">Notas</span>
              <span className="text-coffee-700">{sale.notes}</span>
            </>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h4 className="text-xs font-semibold text-coffee-500 uppercase tracking-wide mb-3">
          Historial
        </h4>
        <ol className="relative border-l border-coffee-200 ml-2 space-y-4">
          {/* Sale created event */}
          <li className="ml-4">
            <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-green-500 ring-2 ring-cream-dark" />
            <p className="text-sm font-medium text-coffee-800">Venta realizada</p>
            <p className="text-xs text-coffee-400">
              {sale.cashier_email ?? sale.cashier_name ?? sale.cashier_id}
            </p>
            <p className="text-xs text-coffee-400">{formatDateTime(sale.created_at)}</p>
          </li>

          {/* Audit events */}
          {!loadingAudit &&
            auditEvents.map((event) => {
              const isCancelled = event.action === 'SALE_CANCELLED'
              const reason =
                (event.new_value as Record<string, unknown> | null)?.reason as string | undefined

              return (
                <li key={event.id} className="ml-4">
                  <span
                    className={`absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-cream-dark ${
                      isCancelled ? 'bg-red-500' : 'bg-amber-400'
                    }`}
                  />
                  <p className="text-sm font-medium text-coffee-800">
                    {isCancelled ? 'Venta cancelada' : 'Venta reembolsada'}
                  </p>
                  <p className="text-xs text-coffee-400">{event.user_email}</p>
                  <p className="text-xs text-coffee-400">{formatDateTime(event.created_at)}</p>
                  {reason && (
                    <p className="text-xs text-coffee-500 mt-0.5">Motivo: {reason}</p>
                  )}
                </li>
              )
            })}
        </ol>
      </div>
    </div>
  )
}
