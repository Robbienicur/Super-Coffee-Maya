import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from './cartStore'
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

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] })
  })

  it('comienza con carrito vacío', () => {
    expect(useCartStore.getState().items).toEqual([])
  })

  it('agrega un producto nuevo', () => {
    const product = makeProduct()
    useCartStore.getState().addItem(product)
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].product.id).toBe('prod-1')
    expect(items[0].quantity).toBe(1)
  })

  it('incrementa cantidad si el producto ya existe', () => {
    const product = makeProduct()
    useCartStore.getState().addItem(product)
    useCartStore.getState().addItem(product)
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
  })

  it('agrega productos distintos como items separados', () => {
    useCartStore.getState().addItem(makeProduct({ id: 'prod-1' }))
    useCartStore.getState().addItem(makeProduct({ id: 'prod-2', name: 'Leche' }))
    expect(useCartStore.getState().items).toHaveLength(2)
  })

  it('elimina un item por productId', () => {
    useCartStore.getState().addItem(makeProduct({ id: 'prod-1' }))
    useCartStore.getState().addItem(makeProduct({ id: 'prod-2' }))
    useCartStore.getState().removeItem('prod-1')
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].product.id).toBe('prod-2')
  })

  it('actualiza la cantidad de un item', () => {
    useCartStore.getState().addItem(makeProduct())
    useCartStore.getState().updateQuantity('prod-1', 5)
    expect(useCartStore.getState().items[0].quantity).toBe(5)
  })

  it('elimina el item si la cantidad es 0 o menor', () => {
    useCartStore.getState().addItem(makeProduct())
    useCartStore.getState().updateQuantity('prod-1', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('limpia todo el carrito', () => {
    useCartStore.getState().addItem(makeProduct({ id: 'prod-1' }))
    useCartStore.getState().addItem(makeProduct({ id: 'prod-2' }))
    useCartStore.getState().clear()
    expect(useCartStore.getState().items).toEqual([])
  })

  it('calcula el total correctamente', () => {
    useCartStore.getState().addItem(makeProduct({ id: 'prod-1', price: 10 }))
    useCartStore.getState().addItem(makeProduct({ id: 'prod-2', price: 25.5 }))
    useCartStore.getState().updateQuantity('prod-1', 3)
    expect(useCartStore.getState().total()).toBe(55.5)
  })

  it('total de carrito vacío es 0', () => {
    expect(useCartStore.getState().total()).toBe(0)
  })
})
