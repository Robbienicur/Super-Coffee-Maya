import { useEffect, useState } from 'react'
import type { Profile } from '../../types/database'
import supabase from '../../lib/supabaseClient'

export interface SalesFilterValues {
  dateRange: { start: string; end: string }
  cashierId: string
  paymentMethod: string
  status: string
}

interface SalesFiltersProps {
  filters: SalesFilterValues
  onChange: (filters: SalesFilterValues) => void
  isAdmin: boolean
}

type DatePreset = 'today' | '7days' | '30days' | 'month' | 'custom'

function getMexicoNow(): Date {
  const str = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
  return new Date(str)
}

function toISOStart(d: Date): string {
  // start of day: midnight Mexico City expressed in UTC
  const offset = new Date().getTime() - new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).getTime()
  const startOfDay = new Date(d)
  startOfDay.setHours(0, 0, 0, 0)
  return new Date(startOfDay.getTime() + offset).toISOString()
}

function toISOEnd(d: Date): string {
  const offset = new Date().getTime() - new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).getTime()
  const endOfDay = new Date(d)
  endOfDay.setHours(23, 59, 59, 999)
  return new Date(endOfDay.getTime() + offset).toISOString()
}

function getPresetRange(preset: Exclude<DatePreset, 'custom'>): { start: string; end: string } {
  const now = getMexicoNow()

  if (preset === 'today') {
    return { start: toISOStart(now), end: toISOEnd(now) }
  }

  if (preset === '7days') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    return { start: toISOStart(start), end: toISOEnd(now) }
  }

  if (preset === '30days') {
    const start = new Date(now)
    start.setDate(now.getDate() - 29)
    return { start: toISOStart(start), end: toISOEnd(now) }
  }

  // month
  const start = new Date(now)
  start.setDate(1)
  return { start: toISOStart(start), end: toISOEnd(now) }
}

// Format a UTC ISO string as YYYY-MM-DD in Mexico City time (for date inputs)
function isoToLocalDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const local = d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) // YYYY-MM-DD
  return local
}

// Convert a YYYY-MM-DD string (Mexico date) to start/end ISO UTC strings
function localDateToISOStart(dateStr: string): string {
  if (!dateStr) return ''
  const offset = new Date().getTime() - new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).getTime()
  const d = new Date(`${dateStr}T00:00:00`)
  return new Date(d.getTime() + offset).toISOString()
}

function localDateToISOEnd(dateStr: string): string {
  if (!dateStr) return ''
  const offset = new Date().getTime() - new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })).getTime()
  const d = new Date(`${dateStr}T23:59:59.999`)
  return new Date(d.getTime() + offset).toISOString()
}

const PRESET_LABELS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7days', label: '7 días' },
  { id: '30days', label: '30 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'custom', label: 'Personalizado' },
]

const PAYMENT_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'refunded', label: 'Reembolsada' },
]

export default function SalesFilters({ filters, onChange, isAdmin }: SalesFiltersProps) {
  const [activePreset, setActivePreset] = useState<DatePreset>('today')
  const [cashiers, setCashiers] = useState<Pick<Profile, 'id' | 'name'>[]>([])

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('profiles')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setCashiers(data)
      })
  }, [isAdmin])

  function applyPreset(preset: DatePreset) {
    setActivePreset(preset)
    if (preset === 'custom') return
    const range = getPresetRange(preset)
    onChange({ ...filters, dateRange: range })
  }

  function handleCustomStart(value: string) {
    onChange({
      ...filters,
      dateRange: {
        start: value ? localDateToISOStart(value) : '',
        end: filters.dateRange.end,
      },
    })
  }

  function handleCustomEnd(value: string) {
    onChange({
      ...filters,
      dateRange: {
        start: filters.dateRange.start,
        end: value ? localDateToISOEnd(value) : '',
      },
    })
  }

  const selectClass =
    'text-sm rounded-lg border border-coffee-200 bg-white text-coffee-900 px-3 py-1.5 outline-none focus:ring-2 focus:ring-coffee-500 cursor-pointer'

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date presets */}
      <div className="flex items-center gap-1 bg-coffee-100 rounded-lg p-1">
        {PRESET_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => applyPreset(id)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap ${
              activePreset === id
                ? 'bg-coffee-800 text-white font-medium'
                : 'text-coffee-700 hover:bg-coffee-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {activePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-coffee-500 whitespace-nowrap">Desde</label>
          <input
            type="date"
            value={isoToLocalDate(filters.dateRange.start)}
            onChange={(e) => handleCustomStart(e.target.value)}
            className={selectClass}
          />
          <label className="text-xs text-coffee-500 whitespace-nowrap">Hasta</label>
          <input
            type="date"
            value={isoToLocalDate(filters.dateRange.end)}
            onChange={(e) => handleCustomEnd(e.target.value)}
            className={selectClass}
          />
        </div>
      )}

      {/* Cashier filter — admin only */}
      {isAdmin && (
        <select
          value={filters.cashierId}
          onChange={(e) => onChange({ ...filters, cashierId: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos los cajeros</option>
          {cashiers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* Payment method */}
      <select
        value={filters.paymentMethod}
        onChange={(e) => onChange({ ...filters, paymentMethod: e.target.value })}
        className={selectClass}
      >
        {PAYMENT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className={selectClass}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
