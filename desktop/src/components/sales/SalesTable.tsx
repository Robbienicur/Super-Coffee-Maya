import { Fragment } from 'react'
import type { Sale } from '../../types/database'
import SaleDetail from './SaleDetail'

export interface SaleWithCashier extends Sale {
  cashier_name: string
  cashier_email: string
}

interface SalesTableProps {
  sales: SaleWithCashier[]
  isAdmin: boolean
  currentUserId: string
  expandedSaleId: string | null
  onToggleExpand: (saleId: string) => void
  onCancel: (sale: SaleWithCashier) => void
  onRefund: (sale: SaleWithCashier) => void
}

const formatMXN = (amount: number) =>
  amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function isTodayInMexico(dateStr: string): boolean {
  const saleDate = new Date(dateStr).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  return saleDate === today
}

const PAYMENT_LABELS: Record<Sale['payment_method'], string> = {
  cash: '💵 Efectivo',
  card: '💳 Tarjeta',
  transfer: '🏦 Transferencia',
}

const STATUS_STYLES: Record<Sale['status'], string> = {
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-yellow-100 text-yellow-700',
}

const STATUS_LABELS: Record<Sale['status'], string> = {
  completed: 'Completada',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
}

export default function SalesTable({
  sales,
  isAdmin,
  currentUserId,
  expandedSaleId,
  onToggleExpand,
  onCancel,
  onRefund,
}: SalesTableProps) {
  if (sales.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-coffee-300 text-sm">
        No se encontraron ventas
      </div>
    )
  }

  const colSpan = isAdmin ? 6 : 5

  return (
    <div className="overflow-x-auto rounded-xl border border-coffee-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-coffee-900 text-coffee-100 text-left">
            <th className="px-4 py-3 font-semibold">Fecha/Hora</th>
            {isAdmin && <th className="px-4 py-3 font-semibold">Cajero</th>}
            <th className="px-4 py-3 font-semibold text-right">Total</th>
            <th className="px-4 py-3 font-semibold">Método</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => {
            const isExpanded = expandedSaleId === sale.id
            const isOwnSale = sale.cashier_id === currentUserId
            const isCompleted = sale.status === 'completed'

            const canCancel =
              isCompleted &&
              (isAdmin || (isOwnSale && isTodayInMexico(sale.created_at)))

            const canRefund = isAdmin && isCompleted

            const showActions = isCompleted && (canCancel || canRefund)

            return (
              <Fragment key={sale.id}>
                <tr
                  onClick={() => onToggleExpand(sale.id)}
                  className={`border-t border-coffee-100 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-coffee-100' : 'bg-white hover:bg-coffee-100/50'
                  }`}
                >
                  <td className="px-4 py-3 text-coffee-700 whitespace-nowrap">
                    {formatDateTime(sale.created_at)}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-coffee-700">
                      {sale.cashier_name || sale.cashier_email}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right font-medium text-coffee-900">
                    {formatMXN(sale.total)}
                  </td>
                  <td className="px-4 py-3 text-coffee-700">
                    {PAYMENT_LABELS[sale.payment_method]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[sale.status]}`}
                    >
                      {STATUS_LABELS[sale.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {showActions && (
                      <div className="flex items-center gap-2">
                        {canCancel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCancel(sale)
                            }}
                            className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                        {canRefund && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onRefund(sale)
                            }}
                            className="text-xs px-2.5 py-1 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition-colors"
                          >
                            Reembolsar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-t border-coffee-100 bg-coffee-100">
                    <td colSpan={colSpan} className="px-6 py-4">
                      <SaleDetail sale={sale} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
