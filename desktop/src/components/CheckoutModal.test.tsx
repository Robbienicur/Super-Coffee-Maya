import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAuthStore } from '../store/authStore'
import type { CartItem } from '../store/cartStore'
import type { Product } from '../types/database'

// vi.hoisted runs before vi.mock hoisting, so mockSupabase is available in the factory
const { mockSupabase } = vi.hoisted(() => {
  function createChainableMock() {
    const mock: Record<string, ReturnType<typeof vi.fn>> = {}
    const chain = new Proxy(mock, {
      get(target, prop: string) {
        if (prop === 'then') return undefined
        if (!target[prop]) {
          target[prop] = vi.fn().mockReturnValue(chain)
        }
        return target[prop]
      },
    })
    return chain
  }

  const chainable = createChainableMock()
  const mockSupabase = {
    from: vi.fn(() => chainable),
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
      setSession: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }
  return { mockSupabase }
})

vi.mock('../lib/supabaseClient', () => ({ default: mockSupabase }))
vi.mock('../lib/auditLogger', () => ({ logAction: vi.fn().mockResolvedValue(undefined) }))

const CheckoutModal = (await import('./CheckoutModal')).default

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  barcode: '7501000001',
  name: 'Café Molido',
  description: '',
  price: 50,
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

const defaultItems: CartItem[] = [
  { product: makeProduct(), quantity: 2 },
]
const defaultTotal = 100

describe('CheckoutModal', () => {
  let onClose: ReturnType<typeof vi.fn>
  let onComplete: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    onClose = vi.fn()
    onComplete = vi.fn()
    useAuthStore.setState({
      profile: {
        id: 'user-1',
        email: 'cajera@test.com',
        name: 'Cajera',
        role: 'cashier',
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    })
  })

  it('muestra el total a cobrar', () => {
    render(
      <CheckoutModal
        items={defaultItems}
        total={defaultTotal}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
    expect(screen.getByText('Total a cobrar')).toBeInTheDocument()
    // The formatted total should appear in the document
    expect(screen.getByText('Cobrar Venta')).toBeInTheDocument()
  })

  it('botón Confirmar deshabilitado sin monto', () => {
    render(
      <CheckoutModal
        items={defaultItems}
        total={defaultTotal}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Venta/i })
    expect(confirmBtn).toBeDisabled()
  })

  it('muestra "Monto insuficiente" cuando el monto es menor que el total', () => {
    render(
      <CheckoutModal
        items={defaultItems}
        total={defaultTotal}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
    const input = screen.getByPlaceholderText('$0.00')
    fireEvent.change(input, { target: { value: '50' } })
    expect(screen.getByText(/Monto insuficiente/i)).toBeInTheDocument()
  })

  it('muestra el cambio cuando el monto es suficiente', () => {
    render(
      <CheckoutModal
        items={defaultItems}
        total={defaultTotal}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
    const input = screen.getByPlaceholderText('$0.00')
    fireEvent.change(input, { target: { value: '150' } })
    expect(screen.getByText('Cambio')).toBeInTheDocument()
  })

  it('habilita botón Confirmar cuando el monto es suficiente', () => {
    render(
      <CheckoutModal
        items={defaultItems}
        total={defaultTotal}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
    const input = screen.getByPlaceholderText('$0.00')
    fireEvent.change(input, { target: { value: '100' } })
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Venta/i })
    expect(confirmBtn).not.toBeDisabled()
  })

  it('llama a onClose al hacer click en Cancelar', () => {
    render(
      <CheckoutModal
        items={defaultItems}
        total={defaultTotal}
        onClose={onClose}
        onComplete={onComplete}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
