export const DEFAULT_TAX_RATE = 0.08

export function applyTaxIfNeeded(
  rawCost: number,
  includesTax: boolean,
  taxRate: number,
): number {
  if (includesTax) return rawCost
  return Math.round(rawCost * (1 + taxRate) * 100) / 100
}
