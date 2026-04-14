import { describe, it, expect, beforeEach } from 'vitest'
import { useNavigationStore } from './navigationStore'

describe('navigationStore', () => {
  beforeEach(() => {
    useNavigationStore.setState({ currentPage: 'pos' })
  })

  it('página inicial es pos', () => {
    expect(useNavigationStore.getState().currentPage).toBe('pos')
  })

  it('cambia a inventory', () => {
    useNavigationStore.getState().setPage('inventory')
    expect(useNavigationStore.getState().currentPage).toBe('inventory')
  })

  it('cambia a sales', () => {
    useNavigationStore.getState().setPage('sales')
    expect(useNavigationStore.getState().currentPage).toBe('sales')
  })

  it('cambia a audit', () => {
    useNavigationStore.getState().setPage('audit')
    expect(useNavigationStore.getState().currentPage).toBe('audit')
  })
})
