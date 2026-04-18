import { describe, it, expect } from 'vitest'
import { applyTaxIfNeeded, DEFAULT_TAX_RATE } from './taxMath'

describe('applyTaxIfNeeded', () => {
  it('devuelve el valor literal si la casilla indica que ya incluye impuesto', () => {
    expect(applyTaxIfNeeded(50, true, 0.08)).toBe(50)
  })

  it('aplica el 8% cuando la casilla indica que no incluye', () => {
    expect(applyTaxIfNeeded(50, false, 0.08)).toBe(54)
  })

  it('acepta tasas distintas (16%)', () => {
    expect(applyTaxIfNeeded(50, false, 0.16)).toBe(58)
  })

  it('tasa 0 no cambia el valor', () => {
    expect(applyTaxIfNeeded(50, false, 0)).toBe(50)
  })

  it('redondea a 2 decimales en valores con fracciones', () => {
    expect(applyTaxIfNeeded(33.33, false, 0.08)).toBe(36)
  })

  it('no pierde precisión en valores chicos', () => {
    expect(applyTaxIfNeeded(0.01, false, 0.08)).toBe(0.01)
  })

  it('exporta DEFAULT_TAX_RATE = 0.08', () => {
    expect(DEFAULT_TAX_RATE).toBe(0.08)
  })
})
