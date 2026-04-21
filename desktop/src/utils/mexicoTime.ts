// Utilidades de rango de día en zona America/Mexico_City.
// Devuelven ISO con offset -06:00 (CST). México no observa DST desde 2022.
const MX_OFFSET = '-06:00'

function mxDateParts(date: Date): { y: string; m: string; d: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const lookup: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== 'literal') lookup[p.type] = p.value
  }
  return { y: lookup.year, m: lookup.month, d: lookup.day }
}

export function getMexicoDayStart(date: Date = new Date()): string {
  const { y, m, d } = mxDateParts(date)
  return `${y}-${m}-${d}T00:00:00${MX_OFFSET}`
}

export function getMexicoDayEnd(date: Date = new Date()): string {
  const { y, m, d } = mxDateParts(date)
  return `${y}-${m}-${d}T23:59:59.999${MX_OFFSET}`
}

export function getMexicoDateString(date: Date = new Date()): string {
  const { y, m, d } = mxDateParts(date)
  return `${y}-${m}-${d}`
}
