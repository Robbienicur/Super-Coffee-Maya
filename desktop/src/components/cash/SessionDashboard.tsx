import { useEffect, useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Receipt, Wallet, Clock, CircleDollarSign } from 'lucide-react'
import supabase from '../../lib/supabaseClient'
import { useSessionStore } from '../../store/sessionStore'
import { useAuthStore } from '../../store/authStore'
import { formatMXN } from '../../utils/formatMXN'
import MovementModal from './MovementModal'
import type { CashMovement } from '../../types/database'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function movementLabel(type: CashMovement['type']): string {
  return type === 'drop' ? 'Retiro' : type === 'pickup' ? 'Ingreso' : 'Gasto'
}

function movementColor(type: CashMovement['type']): string {
  return type === 'drop' ? 'text-red-600' : type === 'pickup' ? 'text-green-600' : 'text-amber-600'
}

interface Props {
  onStartClose: () => void
}

export default function SessionDashboard({ onStartClose }: Props) {
  const profile = useAuthStore((s) => s.profile)
  const session = useSessionStore((s) => s.session)
  const expected = useSessionStore((s) => s.expected)
  const refresh = useSessionStore((s) => s.refresh)

  const [movements, setMovements] = useState<CashMovement[]>([])
  const [modalType, setModalType] = useState<CashMovement['type'] | null>(null)

  useEffect(() => {
    if (!session) return

    const load = async () => {
      const { data } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
      setMovements((data as CashMovement[]) || [])
    }
    load()

    // Refrescar cada 30s para mantener cifras vivas sin suscripción compleja.
    const interval = setInterval(() => {
      refresh()
      load()
    }, 30000)

    return () => clearInterval(interval)
  }, [session?.id, refresh])

  if (!session || !expected) return null

  const isOwner = profile?.id === session.cashier_id
  const durationMs = Date.now() - new Date(session.opened_at).getTime()
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900">Caja abierta</h1>
          <p className="text-sm text-coffee-600 flex items-center gap-2 mt-1">
            <Clock size={14} />
            Desde las {formatTime(session.opened_at)} · {hours}h {minutes}m
          </p>
        </div>
        {isOwner && (
          <button
            onClick={onStartClose}
            className="px-4 py-2.5 rounded-lg bg-coffee-900 text-white text-sm font-semibold hover:bg-coffee-800 transition-colors"
          >
            Cerrar caja
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card
          icon={<Wallet size={18} />}
          label="Fondo inicial"
          value={formatMXN(expected.opening_float)}
        />
        <Card
          icon={<CircleDollarSign size={18} />}
          label={`Ventas (${expected.sales_count})`}
          value={formatMXN(expected.cash_sales + expected.card_sales + expected.transfer_sales)}
          sub={`${formatMXN(expected.cash_sales)} efectivo`}
        />
        <Card
          icon={<Wallet size={18} />}
          label="Efectivo esperado"
          value={formatMXN(expected.expected_cash)}
          highlight
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-coffee-900 mb-3">Desglose por método de pago</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Row label="Efectivo" value={formatMXN(expected.cash_sales)} />
          <Row label="Tarjeta" value={formatMXN(expected.card_sales)} />
          <Row label="Transferencia" value={formatMXN(expected.transfer_sales)} />
        </div>
        <div className="border-t border-coffee-100 mt-4 pt-3 grid grid-cols-3 gap-4 text-sm">
          <Row label="Retiros" value={formatMXN(expected.total_drops)} muted />
          <Row label="Ingresos" value={formatMXN(expected.total_pickups)} muted />
          <Row label="Gastos" value={formatMXN(expected.total_expenses)} muted />
        </div>
      </div>

      {isOwner && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <ActionButton
            icon={<ArrowUpCircle size={18} />}
            label="Retiro"
            onClick={() => setModalType('drop')}
          />
          <ActionButton
            icon={<ArrowDownCircle size={18} />}
            label="Ingreso"
            onClick={() => setModalType('pickup')}
          />
          <ActionButton
            icon={<Receipt size={18} />}
            label="Gasto"
            onClick={() => setModalType('expense')}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-coffee-900 mb-3">Movimientos del turno</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-coffee-400 italic">Sin movimientos registrados todavía.</p>
        ) : (
          <ul className="divide-y divide-coffee-100">
            {movements.map((m) => (
              <li key={m.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className={`text-sm font-medium ${movementColor(m.type)}`}>
                    {movementLabel(m.type)} · {formatMXN(m.amount)}
                  </div>
                  <div className="text-xs text-coffee-500">{m.reason}</div>
                </div>
                <div className="text-xs text-coffee-400">{formatTime(m.created_at)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalType && <MovementModal type={modalType} onClose={() => setModalType(null)} />}
    </div>
  )
}

function Card({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl shadow-sm ${highlight ? 'bg-coffee-900 text-coffee-100' : 'bg-white'}`}>
      <div className={`flex items-center gap-2 text-xs mb-2 ${highlight ? 'text-coffee-200' : 'text-coffee-500'}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-white' : 'text-coffee-900'}`}>{value}</div>
      {sub && <div className={`text-xs mt-1 ${highlight ? 'text-coffee-200' : 'text-coffee-500'}`}>{sub}</div>}
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div className={`text-xs ${muted ? 'text-coffee-400' : 'text-coffee-500'}`}>{label}</div>
      <div className={`font-semibold ${muted ? 'text-coffee-600' : 'text-coffee-900'}`}>{value}</div>
    </div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 py-4 rounded-xl bg-white hover:bg-coffee-50 border border-coffee-200 text-coffee-800 transition-colors"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
