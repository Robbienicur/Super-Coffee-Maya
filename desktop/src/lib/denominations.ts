import type { DenominationCounts } from '../types/database'

export const BILL_VALUES = [1000, 500, 200, 100, 50, 20] as const
export const COIN_VALUES = [10, 5, 2, 1, 0.5] as const

export function emptyCounts(): DenominationCounts {
  return {
    bills: Object.fromEntries(BILL_VALUES.map((v) => [String(v), 0])),
    coins: Object.fromEntries(COIN_VALUES.map((v) => [String(v), 0])),
  }
}

export function sumCounts(counts: DenominationCounts): number {
  let total = 0
  for (const [value, qty] of Object.entries(counts.bills)) {
    total += Number(value) * qty
  }
  for (const [value, qty] of Object.entries(counts.coins)) {
    total += Number(value) * qty
  }
  return Math.round(total * 100) / 100
}

export function formatDenomLabel(value: number): string {
  if (value < 1) return `$${value.toFixed(2)}`
  return `$${value}`
}
