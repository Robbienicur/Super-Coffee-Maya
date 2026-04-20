import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRef } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ProductSearch from './ProductSearch'
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
  track_stock: true,
  category: 'Bebidas',
  image_url: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const defaultRef = () => createRef<HTMLInputElement>()

describe('ProductSearch', () => {
  let onAddToCart: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onAddToCart = vi.fn()
  })

  it('muestra todos los productos', () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Café Molido' }),
      makeProduct({ id: 'p2', name: 'Leche Entera' }),
    ]
    render(
      <ProductSearch
        products={products}
        onAddToCart={onAddToCart}
        searchInputRef={defaultRef()}
      />
    )
    expect(screen.getByText('Café Molido')).toBeInTheDocument()
    expect(screen.getByText('Leche Entera')).toBeInTheDocument()
  })

  it('filtra por texto de búsqueda', () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Café Molido' }),
      makeProduct({ id: 'p2', name: 'Leche Entera' }),
    ]
    render(
      <ProductSearch
        products={products}
        onAddToCart={onAddToCart}
        searchInputRef={defaultRef()}
      />
    )
    const input = screen.getByPlaceholderText('Buscar producto por nombre...')
    fireEvent.change(input, { target: { value: 'café' } })
    expect(screen.getByText('Café Molido')).toBeInTheDocument()
    expect(screen.queryByText('Leche Entera')).not.toBeInTheDocument()
  })

  it('filtra por categoría', () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Café Molido', category: 'Bebidas' }),
      makeProduct({ id: 'p2', name: 'Galletas', category: 'Snacks' }),
    ]
    render(
      <ProductSearch
        products={products}
        onAddToCart={onAddToCart}
        searchInputRef={defaultRef()}
      />
    )
    fireEvent.click(screen.getByText('Snacks'))
    expect(screen.getByText('Galletas')).toBeInTheDocument()
    expect(screen.queryByText('Café Molido')).not.toBeInTheDocument()
  })

  it('muestra badge "Bajo" para productos con stock bajo', () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Café Molido', stock: 1, min_stock: 2 }),
    ]
    render(
      <ProductSearch
        products={products}
        onAddToCart={onAddToCart}
        searchInputRef={defaultRef()}
      />
    )
    expect(screen.getByText('Bajo')).toBeInTheDocument()
  })

  it('deshabilita productos sin existencias', () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Café Agotado', stock: 0 }),
    ]
    render(
      <ProductSearch
        products={products}
        onAddToCart={onAddToCart}
        searchInputRef={defaultRef()}
      />
    )
    const btn = screen.getByRole('button', { name: /Café Agotado/i })
    expect(btn).toBeDisabled()
  })

  it('llama a onAddToCart al hacer click en un producto', () => {
    const product = makeProduct({ id: 'p1', name: 'Café Molido' })
    render(
      <ProductSearch
        products={[product]}
        onAddToCart={onAddToCart}
        searchInputRef={defaultRef()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Café Molido/i }))
    expect(onAddToCart).toHaveBeenCalledTimes(1)
    expect(onAddToCart).toHaveBeenCalledWith(product)
  })

  it('muestra mensaje de estado vacío cuando no hay resultados', () => {
    const products = [
      makeProduct({ id: 'p1', name: 'Café Molido' }),
    ]
    render(
      <ProductSearch
        products={products}
        onAddToCart={onAddToCart}
        searchInputRef={defaultRef()}
      />
    )
    const input = screen.getByPlaceholderText('Buscar producto por nombre...')
    fireEvent.change(input, { target: { value: 'xyz no existe' } })
    expect(screen.getByText('No se encontraron productos')).toBeInTheDocument()
  })
})
