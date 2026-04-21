import { create } from 'zustand'
import supabase from '../lib/supabaseClient'
import type { CashSession, SessionExpectedCash } from '../types/database'

interface SessionStore {
  session: CashSession | null
  expected: SessionExpectedCash | null
  isLoading: boolean

  loadForCashier: (cashierId: string) => Promise<void>
  refresh: () => Promise<void>
  open: (cashierId: string, openingFloat: number) => Promise<{ error: string | null }>
  clear: () => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  expected: null,
  isLoading: false,

  loadForCashier: async (cashierId) => {
    set({ isLoading: true })
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('cashier_id', cashierId)
      .in('status', ['open', 'closing'])
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      set({ session: null, expected: null, isLoading: false })
      return
    }

    set({ session: data as CashSession, isLoading: false })
    await get().refresh()
  },

  refresh: async () => {
    const current = get().session
    if (!current) return

    const [{ data: sessionData }, { data: expectedData }] = await Promise.all([
      supabase.from('cash_sessions').select('*').eq('id', current.id).single(),
      supabase.rpc('get_session_expected_cash', { p_session_id: current.id }),
    ])

    set({
      session: sessionData ? (sessionData as CashSession) : current,
      expected: expectedData as SessionExpectedCash | null,
    })
  },

  open: async (cashierId, openingFloat) => {
    const { data, error } = await supabase
      .from('cash_sessions')
      .insert({ cashier_id: cashierId, opening_float: openingFloat })
      .select()
      .single()

    if (error) return { error: error.message }

    set({ session: data as CashSession })
    await get().refresh()
    return { error: null }
  },

  clear: () => set({ session: null, expected: null }),
}))
