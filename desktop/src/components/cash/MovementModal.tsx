import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Receipt, X } from 'lucide-react'
import supabase from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import { logAction } from '../../lib/auditLogger'
import { formatMXN } from '../../utils/formatMXN'
import type { CashMovement } from '../../types/database'

type MovementType = CashMovement['type']

interface Props {
  type: MovementType
  onClose: () => void
}

const CONFIG: Record<MovementType, { title: string; subtitle: string; icon: typeof ArrowDownCircle; placeholder: string; auditAction: string }> = {
  drop: {
    title: 'Retiro de efectivo',
    subtitle: 'Sacar dinero de la caja (ej: a caja fuerte).',
    icon: ArrowUpCircle,
    placeholder: 'Ej: Retiro a caja fuerte',
    auditAction: 'CASH_DROP',
  },
  pickup: {
    title: 'Ingreso de efectivo',
    subtitle: 'Meter dinero a la caja (ej: más cambio).',
    icon: ArrowDownCircle,
    placeholder: 'Ej: Fondo adicional para cambio',
    auditAction: 'CASH_PICKUP',
  },
  expense: {
    title: 'Gasto en efectivo',
    subtitle: 'Salida de efectivo para pagar algo.',
    icon: Receipt,
    placeholder: 'Ej: Papelería, propina, proveedor',
    auditAction: 'CASH_EXPENSE',
  },
}

export default function MovementModal({ type, onClose }: Props) {
  const cfg = CONFIG[type]
  const Icon = cfg.icon

  const profile = useAuthStore((s) => s.profile)
  const session = useSessionStore((s) => s.session)
  const refresh = useSessionStore((s) => s.refresh)

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = Number(amount)
  const valid = !isNaN(parsed) && parsed > 0 && reason.trim().length > 0

  const handleSubmit = async () => {
    if (!profile || !session || !valid) return
    setSubmitting(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('cash_movements')
      .insert({
        session_id: session.id,
        type,
        amount: parsed,
        reason: reason.trim(),
        created_by: profile.id,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    await logAction(cfg.auditAction, 'session', session.id, undefined, {
      movement_id: data.id,
      amount: parsed,
      reason: reason.trim(),
    })

    await refresh()
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-[fade-in_200ms_ease-out]">
      <div className="bg-cream rounded-xl p-6 w-full max-w-sm shadow-xl animate-[scale-in_200ms_ease-out]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-coffee-100 flex items-center justify-center">
              <Icon size={20} className="text-coffee-800" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-coffee-900">{cfg.title}</h2>
              <p className="text-xs text-coffee-500">{cfg.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-coffee-400 hover:text-coffee-700">
            <X size={18} />
          </button>
        </div>

        <div className="mb-3">
          <label className="block text-sm text-coffee-700 mb-1">Monto</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-500">$</span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-white border-2 border-coffee-200 text-lg text-coffee-900 outline-none focus:border-coffee-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-coffee-700 mb-1">Motivo</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && valid && !submitting) handleSubmit() }}
            className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-coffee-200 text-sm text-coffee-900 outline-none focus:border-coffee-500"
            placeholder={cfg.placeholder}
          />
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-lg border border-coffee-200 text-coffee-700 text-sm hover:bg-coffee-100 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="flex-1 py-2.5 rounded-lg bg-coffee-900 text-white font-semibold text-sm hover:bg-coffee-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Guardando...' : `Registrar ${parsed > 0 ? formatMXN(parsed) : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
