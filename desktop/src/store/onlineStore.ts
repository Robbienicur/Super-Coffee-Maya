import { create } from 'zustand'
import supabase from '../lib/supabaseClient'

interface OnlineState {
  online: boolean
  _initialized: boolean
  _setOnline: (v: boolean) => void
  _initialize: () => void
}

const PING_INTERVAL_MS = 30_000

// Store global: un sólo interval y un solo par de listeners para toda la app.
export const useOnlineStore = create<OnlineState>((set, get) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  _initialized: false,

  _setOnline: (v) => {
    if (get().online !== v) set({ online: v })
  },

  _initialize: () => {
    if (get()._initialized || typeof window === 'undefined') return
    set({ _initialized: true })

    const setOnline = (v: boolean) => {
      if (get().online !== v) set({ online: v })
    }

    window.addEventListener('online', () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))

    const ping = async () => {
      if (!navigator.onLine) {
        setOnline(false)
        return
      }
      try {
        const { error } = await supabase.from('products').select('id').limit(1)
        setOnline(!error)
      } catch {
        setOnline(false)
      }
    }

    ping()
    setInterval(ping, PING_INTERVAL_MS)
  },
}))

// Se dispara una sola vez por carga de la app.
if (typeof window !== 'undefined') {
  useOnlineStore.getState()._initialize()
}
