export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getTodayStartISO(): string {
  const now = new Date()
  const mexicoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return new Date(`${mexicoDate}T00:00:00-06:00`).toISOString()
}

// Dado "YYYY-MM-DD" (input type=date), devuelve el inicio de día en zona Mexico_City como ISO UTC.
export function getMexicoDayStart(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00-06:00`).toISOString()
}

// Dado "YYYY-MM-DD", devuelve el fin de día (23:59:59.999) en Mexico_City como ISO UTC.
export function getMexicoDayEnd(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999-06:00`).toISOString()
}

export function get30DaysAgoISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  const mexicoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
  return new Date(`${mexicoDate}T00:00:00-06:00`).toISOString()
}

export function formatDateMX(isoString: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString))
}

export function formatDayLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}
