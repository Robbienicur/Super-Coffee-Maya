import { useEffect, useState } from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import supabase from '../../lib/supabaseClient'
import { formatMXN } from '../../utils/formatMXN'
import { BILL_VALUES, COIN_VALUES, formatDenomLabel } from '../../lib/denominations'
import type { CashSession, Profile } from '../../types/database'

interface Props {
  sessionId: string
  onBack: () => void
}

interface SessionWithCashier extends CashSession {
  cashier: Pick<Profile, 'name' | 'email'> | null
  closer: Pick<Profile, 'name' | 'email'> | null
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(openedAt: string, closedAt: string | null): string {
  if (!closedAt) return '—'
  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime()
  const h = Math.floor(ms / (1000 * 60 * 60))
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${h}h ${m}m`
}

export default function ZReport({ sessionId, onBack }: Props) {
  const [data, setData] = useState<SessionWithCashier | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: sess } = await supabase
        .from('cash_sessions')
        .select(`
          *,
          cashier:profiles!cash_sessions_cashier_id_fkey(name, email),
          closer:profiles!cash_sessions_closed_by_fkey(name, email)
        `)
        .eq('id', sessionId)
        .single()
      setData(sess as unknown as SessionWithCashier)
      setLoading(false)
    }
    load()
  }, [sessionId])

  if (loading) {
    return <div className="p-6 text-coffee-600">Cargando reporte...</div>
  }

  if (!data) {
    return <div className="p-6 text-coffee-600">No se encontró el reporte.</div>
  }

  const absDiff = Math.abs(data.difference)
  const hasDiff = absDiff > 0.009 // evita ruido de redondeo en numeric

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-coffee-600 hover:text-coffee-900">
          <ArrowLeft size={14} /> Volver
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-coffee-900 text-white text-sm hover:bg-coffee-800 transition-colors"
        >
          <Printer size={14} /> Imprimir
        </button>
      </div>

      <div id="z-report" className="bg-white rounded-xl shadow-sm p-8 print:shadow-none print:p-0">
        <div className="text-center mb-6 border-b border-coffee-200 pb-4">
          <h1 className="text-xl font-bold text-coffee-900">Coffe Maya</h1>
          <p className="text-sm text-coffee-600 uppercase tracking-wider">Corte de caja</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-6">
          <InfoRow label="Sesión" value={`#${data.id.slice(0, 8)}`} />
          <InfoRow label="Cajera" value={data.cashier?.name || data.cashier?.email || '—'} />
          <InfoRow label="Apertura" value={formatDateTime(data.opened_at)} />
          <InfoRow label="Cierre" value={formatDateTime(data.closed_at)} />
          <InfoRow label="Duración" value={formatDuration(data.opened_at, data.closed_at)} />
          <InfoRow label="Tickets" value={String(data.sales_count ?? 0)} />
        </div>

        <Section title="Ventas">
          <Line label="Efectivo" value={formatMXN(data.cash_sales ?? 0)} />
          <Line label="Tarjeta" value={formatMXN(data.card_sales ?? 0)} />
          <Line label="Transferencia" value={formatMXN(data.transfer_sales ?? 0)} />
          <Line
            label="Total"
            value={formatMXN((data.cash_sales ?? 0) + (data.card_sales ?? 0) + (data.transfer_sales ?? 0))}
            bold
          />
          {(data.total_refunds ?? 0) > 0 && (
            <Line label="Cancelaciones" value={formatMXN(data.total_refunds ?? 0)} muted />
          )}
        </Section>

        <Section title="Movimientos de efectivo">
          <Line label="Fondo inicial" value={formatMXN(data.opening_float)} />
          <Line label="+ Ingresos" value={formatMXN(data.total_pickups ?? 0)} />
          <Line label="− Retiros" value={formatMXN(data.total_drops ?? 0)} />
          <Line label="− Gastos" value={formatMXN(data.total_expenses ?? 0)} />
        </Section>

        <Section title="Conteo al cierre">
          {BILL_VALUES.map((v) => {
            const qty = data.closing_counts?.bills?.[String(v)] ?? 0
            if (qty === 0) return null
            return (
              <Line
                key={`b-${v}`}
                label={`${formatDenomLabel(v)} × ${qty}`}
                value={formatMXN(v * qty)}
              />
            )
          })}
          {COIN_VALUES.map((v) => {
            const qty = data.closing_counts?.coins?.[String(v)] ?? 0
            if (qty === 0) return null
            return (
              <Line
                key={`c-${v}`}
                label={`${formatDenomLabel(v)} × ${qty}`}
                value={formatMXN(v * qty)}
              />
            )
          })}
          <Line label="Total contado" value={formatMXN(data.closing_cash_counted ?? 0)} bold />
        </Section>

        <Section title="Arqueo">
          <Line label="Efectivo esperado" value={formatMXN(data.expected_cash ?? 0)} />
          <Line label="Efectivo contado" value={formatMXN(data.closing_cash_counted ?? 0)} />
          <div className={`flex justify-between text-base font-bold pt-2 border-t border-coffee-200 mt-2 ${hasDiff ? (data.difference > 0 ? 'text-green-700' : 'text-red-700') : 'text-coffee-900'}`}>
            <span>Diferencia</span>
            <span>
              {data.difference > 0 ? '+' : ''}{formatMXN(data.difference)}
              {hasDiff && (
                <span className="ml-2 text-xs font-normal">
                  ({data.difference > 0 ? 'sobrante' : 'faltante'})
                </span>
              )}
            </span>
          </div>
        </Section>

        {data.closing_notes && (
          <Section title="Observaciones">
            <p className="text-sm text-coffee-700 italic">{data.closing_notes}</p>
          </Section>
        )}

        <div className="mt-6 pt-4 border-t border-coffee-200 text-xs text-coffee-500 text-center">
          Cerrado por {data.closer?.name || data.closer?.email || '—'}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs uppercase tracking-wide text-coffee-500 font-semibold mb-2">{title}</h3>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-coffee-500">{label}</div>
      <div className="text-coffee-900 font-medium">{value}</div>
    </div>
  )
}

function Line({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-coffee-900 pt-1 border-t border-coffee-100 mt-1' : muted ? 'text-coffee-400' : 'text-coffee-700'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
