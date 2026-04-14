import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Cart from './Cart'
import { useCartStore } from '../store/cartStore'
import type { Product } from '../types/database'

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  barcode: '7501000001',
  name: 'Café Molido',
  description: '',
  price: 45.5,
  cost_price: 30,
  stock: 10,
  min_stock: 2,
  category: 'Bebidas',
  image_url: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('Cart', () => {
  let onCheckout: ReturnType<typeof vi.fn>
  let onCancelPastSale: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onCheckout = vi.fn()
    onCancelPastSale = vi.fn()
    useCartStore.setState({ items: [] })
  })

  it('muestra mensaje de estado vacío', () => {
    render(<Cart onCheckout={onCheckout} onCancelPastSale={onCancelPastSale} />)
    expect(screen.getByText('Escanea o busca un producto')).toBeInTheDocument()
  })

  it('muestra los items del carrito', () => {
    const product = makeProduct({ id: 'p1', name: 'Café Molido', price: 45.5 })
    useCartStore.setState({
      items: [{ product, quantity: 2 }],
    })
    render(<Cart onCheckout={onCheckout} onCancelPastSale={onCancelPastSale} />)
    expect(screen.getByText('Café Molido')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('botón Cobrar deshabilitado cuando carrito está vacío', () => {
    render(<Cart onCheckout={onCheckout} onCancelPastSale={onCancelPastSale} />)
    const cobrarBtn = screen.getByRole('button', { name: /Cobrar/i })
    expect(cobrarBtn).toBeDisabled()
  })

  it('botón Cobrar llama a onCheckout cuando hay items', () => {
    const product = makeProduct({ id: 'p1', name: 'Café Molido' })
    useCartStore.setState({
      items: [{ product, quantity: 1 }],
    })
    render(<Cart onCheckout={onCheckout} onCancelPastSale={onCancelPastSale} />)
    const cobrarBtn = screen.getByRole('button', { name: /Cobrar/i })
    expect(cobrarBtn).not.toBeDisabled()
    fireEvent.click(cobrarBtn)
    expect(onCheckout).toHaveBeenCalledTimes(1)
  })

  it('"Cancelar venta pasada" llama a onCancelPastSale', () => {
    render(<Cart onCheckout={onCheckout} onCancelPastSale={onCancelPastSale} />)
    fireEvent.click(screen.getByText('Cancelar venta pasada'))
    expect(onCancelPastSale).toHaveBeenCalledTimes(1)
  })
})
