import { useMemo, useState } from 'react'
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'
import supabase from '../../lib/supabaseClient'
import { useSessionStore } from '../../store/sessionStore'
import { logAction } from '../../lib/auditLogger'
import { formatMXN } from '../../utils/formatMXN'
import { BILL_VALUES, COIN_VALUES, emptyCounts, sumCounts, formatDenomLabel } from '../../lib/denominations'
import type { DenominationCounts } from '../../types/database'

const TOLERANCE = 20 // MXN: |diferencia| ≤ $20 se considera normal

interface Props {
  onBack: () => void
  onClosed: (sessionId: string) => void
}

export default function CloseSessionForm({ onBack, onClosed }: Props) {
  const session = useSessionStore((s) => s.session)
  const expected = useSessionStore((s) => s.expected)

  const [counts, setCounts] = useState<DenominationCounts>(emptyCounts())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const counted = useMemo(() => sumCounts(counts), [counts])
  const expectedCash = expected?.expected_cash ?? 0
  const difference = Math.round((counted - expectedCash) * 100) / 100
  const absDiff = Math.abs(difference)

  const needsNote = absDiff > TOLERANCE
  const canSubmit = !submitting && (!needsNote || notes.trim().length > 0)

  const setBill = (value: number, qty: string) => {
    const n = Math.max(0, parseInt(qty || '0', 10) || 0)
    setCounts((c) => ({ ...c, bills: { ...c.bills, [value]: n } }))
  }

  const setCoin = (value: number, qty: string) => {
    const n = Math.max(0, parseInt(qty || '0', 10) || 0)
    setCounts((c) => ({ ...c, coins: { ...c.coins, [value]: n } }))
  }

  const handleClose = async () => {
    if (!session || !canSubmit) return
    setSubmitting(true)
    setError(null)

    const { data, error: err } = await supabase.rpc('close_cash_session', {
      p_session_id: session.id,
      p_closing_counts: counts,
      p_notes: notes.trim(),
    })

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    await logAction('SESSION_CLOSED', 'session', session.id, undefined, {
      expected_cash: (data as { expected_cash: number }).expected_cash,
      counted: (data as { counted: number }).counted,
      difference: (data as { difference: number }).difference,
      has_discrepancy: absDiff > TOLERANCE,
    })

    onClosed(session.id)
  }

  const diffBadge = absDiff <= TOLERANCE
    ? { tone: 'bg-green-50 text-green-800 border-green-200', icon: <CheckCircle2 size={16} />, label: difference === 0 ? 'Cuadra' : 'Diferencia tolerable' }
    : { tone: 'bg-red-50 text-red-800 border-red-200', icon: <AlertTriangle size={16} />, label: difference > 0 ? 'Sobrante' : 'Faltante' }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-coffee-600 hover:text-coffee-900 mb-4">
        <ArrowLeft size={14} /> Volver
      </button>

      <h1 className="text-2xl font-bold text-coffee-900 mb-1">Cerrar caja</h1>
      <p className="text-sm text-coffee-600 mb-6">Cuenta el efectivo físico en caja por denominación.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-coffee-900 mb-4">Conteo físico</h2>

          <h3 className="text-xs uppercase tracking-wide text-coffee-500 mb-2">Billetes</h3>
          <div className="space-y-2 mb-5">
            {BILL_VALUES.map((v) => (
              <DenomRow
                key={`bill-${v}`}
                label={formatDenomLabel(v)}
                value={v}
                qty={counts.bills[String(v)] ?? 0}
                onChange={(q) => setBill(v, q)}
              />
            ))}
          </div>

          <h3 className="text-xs uppercase tracking-wide text-coffee-500 mb-2">Monedas</h3>
          <div className="space-y-2">
            {COIN_VALUES.map((v) => (
              <DenomRow
                key={`coin-${v}`}
                label={formatDenomLabel(v)}
                value={v}
                qty={counts.coins[String(v)] ?? 0}
                onChange={(q) => setCoin(v, q)}
              />
            ))}
          </div>

          <div className="border-t border-coffee-100 mt-5 pt-4 flex items-center justify-between">
            <span className="text-sm text-coffee-700">Total contado</span>
            <span className="text-xl font-bold text-coffee-900">{formatMXN(counted)}</span>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <h2 className="text-sm font-semibold text-coffee-900 mb-4">Esperado</h2>
            <dl className="space-y-2 text-sm">
              <ExpectedRow label="Fondo inicial" value={expected?.opening_float ?? 0} />
              <ExpectedRow label="+ Ventas en efectivo" value={expected?.cash_sales ?? 0} />
              <ExpectedRow label="+ Ingresos de efectivo" value={expected?.total_pickups ?? 0} />
              <ExpectedRow label="− Retiros" value={-(expected?.total_drops ?? 0)} />
              <ExpectedRow label="− Gastos" value={-(expected?.total_expenses ?? 0)} />
            </dl>
            <div className="border-t border-coffee-100 mt-4 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-coffee-900">Efectivo esperado</span>
              <span className="text-lg font-bold text-coffee-900">{formatMXN(expectedCash)}</span>
            </div>
          </div>

          <div className={`rounded-xl p-5 border-2 ${diffBadge.tone} mb-4`}>
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              {diffBadge.icon}
              <span>{diffBadge.label}</span>
            </div>
            <div className="text-3xl font-bold">
              {difference > 0 ? '+' : ''}{formatMXN(difference)}
            </div>
            <p className="text-xs mt-1 opacity-80">
              {absDiff <= TOLERANCE
                ? `Diferencia dentro de la tolerancia de ${formatMXN(TOLERANCE)}.`
                : 'Diferencia mayor a la tolerancia. Registra el motivo abajo.'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <label className="block text-sm font-semibold text-coffee-900 mb-2">
              Observaciones {needsNote && <span className="text-red-600">*</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-cream border border-coffee-200 text-sm text-coffee-900 outline-none focus:border-coffee-500 resize-none"
              placeholder={needsNote ? 'Explica la diferencia...' : 'Opcional'}
            />

            {error && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleClose}
              disabled={!canSubmit}
              className="w-full mt-4 py-3 rounded-lg bg-coffee-900 text-white font-semibold hover:bg-coffee-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Cerrando...' : 'Confirmar corte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DenomRow({ label, value, qty, onChange }: { label: string; value: number; qty: number; onChange: (q: string) => void }) {
  const subtotal = Math.round(value * qty * 100) / 100
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 text-sm text-coffee-700">{label}</div>
      <span className="text-coffee-400">×</span>
      <input
        type="number"
        min={0}
        value={qty === 0 ? '' : qty}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-20 px-2 py-1.5 rounded bg-cream border border-coffee-200 text-sm text-coffee-900 text-center outline-none focus:border-coffee-500"
      />
      <div className="ml-auto text-sm font-medium text-coffee-800 min-w-[80px] text-right">
        {formatMXN(subtotal)}
      </div>
    </div>
  )
}

function ExpectedRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-coffee-600">{label}</dt>
      <dd className="text-coffee-900 font-medium">{formatMXN(value)}</dd>
    </div>
  )
}
