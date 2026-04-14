import { describe, it, expect } from 'vitest'
import { formatMXN } from './formatMXN'

describe('formatMXN', () => {
  it('formatea un número entero', () => {
    const result = formatMXN(100)
    expect(result).toContain('100')
    expect(result).toContain('$')
  })

  it('formatea un número con decimales', () => {
    const result = formatMXN(1234.56)
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('56')
  })

  it('formatea cero', () => {
    const result = formatMXN(0)
    expect(result).toContain('0')
    expect(result).toContain('$')
  })

  it('formatea números negativos', () => {
    const result = formatMXN(-50)
    expect(result).toContain('50')
  })
})
