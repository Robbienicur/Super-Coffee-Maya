import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../store/authStore'

// vi.hoisted runs before module hoisting, so mockSupabase is available in the factory
const { mockSupabase, chainable } = vi.hoisted(() => {
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
  return { mockSupabase, chainable }
})

vi.mock('../lib/supabaseClient', () => ({
  default: mockSupabase,
}))

const { logAction } = await import('./auditLogger')

describe('logAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no hace nada si no hay perfil autenticado', async () => {
    useAuthStore.setState({ profile: null })
    await logAction('TEST_ACTION', 'system')
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('inserta un log con los datos correctos', async () => {
    useAuthStore.setState({
      profile: {
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'admin',
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    })

    await logAction('SALE_COMPLETED', 'sale', 'sale-1', undefined, { total: 100 })

    expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs')
    expect(chainable.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      user_email: 'admin@test.com',
      action: 'SALE_COMPLETED',
      entity_type: 'sale',
      entity_id: 'sale-1',
      old_value: null,
      new_value: { total: 100 },
    })
  })

  it('usa valores por defecto para entityId y values', async () => {
    useAuthStore.setState({
      profile: {
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'admin',
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    })

    await logAction('LOGIN', 'session')

    expect(chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_id: '',
        old_value: null,
        new_value: null,
      })
    )
  })
})
