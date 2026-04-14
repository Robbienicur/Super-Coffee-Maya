import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBarcode } from './useBarcode'

describe('useBarcode', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function fireKeys(keys: string[], interval = 10) {
    keys.forEach((key, i) => {
      vi.advanceTimersByTime(i === 0 ? 0 : interval)
      document.dispatchEvent(new KeyboardEvent('keydown', { key }))
    })
  }

  it('detecta una ráfaga rápida como barcode al presionar Enter', () => {
    const onScan = vi.fn()
    renderHook(() => useBarcode({ onScan }))
    fireKeys(['7', '5', '0', '1', '0', '0', '0', 'Enter'], 10)
    expect(onScan).toHaveBeenCalledWith('7501000')
  })

  it('ignora ráfagas de 4 caracteres o menos', () => {
    const onScan = vi.fn()
    renderHook(() => useBarcode({ onScan }))
    fireKeys(['1', '2', '3', '4', 'Enter'], 10)
    expect(onScan).not.toHaveBeenCalled()
  })

  it('ignora typing lento (>100ms entre teclas)', () => {
    const onScan = vi.fn()
    renderHook(() => useBarcode({ onScan }))
    fireKeys(['7', '5', '0', '1', '0', '0', '0', 'Enter'], 150)
    expect(onScan).not.toHaveBeenCalled()
  })

  it('no escucha cuando enabled es false', () => {
    const onScan = vi.fn()
    renderHook(() => useBarcode({ onScan, enabled: false }))
    fireKeys(['7', '5', '0', '1', '0', '0', '0', 'Enter'], 10)
    expect(onScan).not.toHaveBeenCalled()
  })

  it('ignora teclas especiales (Shift, Control, etc)', () => {
    const onScan = vi.fn()
    renderHook(() => useBarcode({ onScan }))
    fireKeys(['Shift', '7', '5', '0', '1', '0', 'Enter'], 10)
    expect(onScan).toHaveBeenCalledWith('75010')
  })
})
