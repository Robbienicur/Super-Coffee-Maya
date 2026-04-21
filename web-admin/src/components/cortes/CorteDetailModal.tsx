'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { formatMXN, formatDateMX } from '@/lib/format'
import type { CashSession, CashMovement } from '@/types/database'

type SessionWithProfiles = CashSession & {
  cashier: { name: string; email: string } | null
  closer: { name: string; email: string } | null
}

const BILL_VALUES = [1000, 500, 200, 100, 50, 20]
const COIN_VALUES = [10, 5, 2, 1, 0.5]

interface Props {
  session: SessionWithProfiles
  onClose: () => void
}

export default function CorteDetailModal({ session, onClose }: Props) {
  const [movements, setMovements] = useState<CashMovement[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })
      setMovements((data as CashMovement[]) || [])
    }
    load()
  }, [session.id])

  const isClosed = session.status === 'closed'
  const diff = session.difference
  const absDiff = Math.abs(diff)
  const hasDiff = absDiff > 0.009

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del corte</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Info label="ID" value={`#${session.id.slice(0, 8)}`} />
            <Info label="Cajera" value={session.cashier?.name || session.cashier?.email || '—'} />
            <Info label="Apertura" value={formatDateMX(session.opened_at)} />
            <Info label="Cierre" value={session.closed_at ? formatDateMX(session.closed_at) : 'En curso'} />
            <Info label="Estado" value={isClosed ? 'Cerrada' : session.status === 'open' ? 'Abierta' : 'Cerrando'} />
            <Info label="Tickets" value={String(session.sales_count ?? 0)} />
          </div>

          <Section title="Ventas">
            <Line label="Efectivo" value={formatMXN(session.cash_sales ?? 0)} />
            <Line label="Tarjeta" value={formatMXN(session.card_sales ?? 0)} />
            <Line label="Transferencia" value={formatMXN(session.transfer_sales ?? 0)} />
            <Line
              label="Total"
              value={formatMXN((session.cash_sales ?? 0) + (session.card_sales ?? 0) + (session.transfer_sales ?? 0))}
              bold
            />
          </Section>

          <Section title="Movimientos">
            <Line label="Fondo inicial" value={formatMXN(session.opening_float)} />
            <Line label="+ Ingresos" value={formatMXN(session.total_pickups ?? 0)} />
            <Line label="− Retiros" value={formatMXN(session.total_drops ?? 0)} />
            <Line label="− Gastos" value={formatMXN(session.total_expenses ?? 0)} />
            {movements.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-coffee-600">
                {movements.map((m) => (
                  <li key={m.id}>
                    <span className="font-medium">{movementLabel(m.type)}</span>
                    {' · '}{formatMXN(m.amount)}{' · '}{m.reason}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {isClosed && session.closing_counts && (
            <Section title="Conteo al cierre">
              {BILL_VALUES.map((v) => {
                const qty = session.closing_counts?.bills?.[String(v)] ?? 0
                if (qty === 0) return null
                return <Line key={`b-${v}`} label={`$${v} × ${qty}`} value={formatMXN(v * qty)} />
              })}
              {COIN_VALUES.map((v) => {
                const qty = session.closing_counts?.coins?.[String(v)] ?? 0
                if (qty === 0) return null
                return <Line key={`c-${v}`} label={`$${v} × ${qty}`} value={formatMXN(v * qty)} />
              })}
              <Line label="Total contado" value={formatMXN(session.closing_cash_counted ?? 0)} bold />
            </Section>
          )}

          {isClosed && (
            <Section title="Arqueo">
              <Line label="Esperado" value={formatMXN(session.expected_cash ?? 0)} />
              <Line label="Contado" value={formatMXN(session.closing_cash_counted ?? 0)} />
              <div className={`flex justify-between text-base font-bold pt-2 border-t border-coffee-200 mt-2 ${hasDiff ? (diff > 0 ? 'text-amber-700' : 'text-red-700') : 'text-green-700'}`}>
                <span>Diferencia</span>
                <span>
                  {diff > 0 ? '+' : ''}{formatMXN(diff)}
                  {hasDiff && (
                    <span className="ml-2 text-xs font-normal">
                      ({diff > 0 ? 'sobrante' : 'faltante'})
                    </span>
                  )}
                </span>
              </div>
            </Section>
          )}

          {session.closing_notes && (
            <Section title="Observaciones">
              <p className="italic text-coffee-700">{session.closing_notes}</p>
            </Section>
          )}

          {isClosed && session.closer && (
            <p className="text-xs text-coffee-500 text-center pt-3 border-t border-coffee-100">
              Cerrado por {session.closer.name || session.closer.email}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function movementLabel(type: CashMovement['type']): string {
  return type === 'drop' ? 'Retiro' : type === 'pickup' ? 'Ingreso' : 'Gasto'
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-coffee-500">{label}</div>
      <div className="font-medium text-coffee-900">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-coffee-500 font-semibold mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-coffee-900 pt-1 border-t border-coffee-100 mt-1' : 'text-coffee-700'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
