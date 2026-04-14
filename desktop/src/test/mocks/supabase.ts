import { vi } from 'vitest'

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

export function createMockSupabase() {
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
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }

  return { mockSupabase, chainable }
}
