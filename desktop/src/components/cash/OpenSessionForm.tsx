import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import { logAction } from '../../lib/auditLogger'
import { formatMXN } from '../../utils/formatMXN'

const SUGGESTED = [100, 200, 300, 500, 1000]

export default function OpenSessionForm() {
  const profile = useAuthStore((s) => s.profile)
  const open = useSessionStore((s) => s.open)
  const [amount, setAmount] = useState('200')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = Number(amount)
  const valid = !isNaN(parsed) && parsed >= 0

  const handleSubmit = async () => {
    if (!profile || !valid) return
    setSubmitting(true)
    setError(null)

    const { error: err } = await open(profile.id, parsed)
    if (err) {
      setError(err.includes('one_open') || err.includes('unique') || err.includes('duplicate')
        ? 'Ya tienes una sesión abierta.'
        : err)
      setSubmitting(false)
      return
    }

    await logAction('SESSION_OPENED', 'session', undefined, undefined, {
      opening_float: parsed,
    })
    setSubmitting(false)
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white rounded-xl shadow-md p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-coffee-100 flex items-center justify-center">
          <Wallet size={20} className="text-coffee-800" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-coffee-900">Abrir caja</h1>
          <p className="text-sm text-coffee-600">Cajera: {profile?.name || profile?.email}</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-coffee-700 mb-1">Fondo inicial</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-500">$</span>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid && !submitting) handleSubmit()
            }}
            className="w-full pl-8 pr-4 py-3 rounded-lg bg-cream border-2 border-coffee-200 text-xl text-coffee-900 outline-none focus:border-coffee-500"
            placeholder="0.00"
          />
        </div>
        <p className="mt-1 text-xs text-coffee-500">
          Efectivo con el que arrancas el turno para dar cambio.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SUGGESTED.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(String(v))}
            className="px-3 py-1.5 text-xs rounded-full border border-coffee-200 text-coffee-700 hover:bg-coffee-100 transition-colors"
          >
            {formatMXN(v)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!valid || submitting}
        className="w-full py-3 rounded-lg bg-coffee-900 text-white font-semibold hover:bg-coffee-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Abriendo...' : 'Abrir caja'}
      </button>
    </div>
  )
}
