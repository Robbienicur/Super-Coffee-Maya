import { create } from 'zustand'
import supabase from '../lib/supabaseClient'
import { useSessionStore } from './sessionStore'
import type { Profile } from '../types/database'

interface AuthStore {
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    set({ isLoading: true })
    try {
      const stored = await window.electronAuth.getSession()
      if (!stored) {
        set({ isLoading: false, isAuthenticated: false })
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: stored.access_token,
        refresh_token: stored.refresh_token,
      })

      if (sessionError) {
        await window.electronAuth.clearSession()
        set({ isLoading: false, isAuthenticated: false })
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        await window.electronAuth.clearSession()
        set({ isLoading: false, isAuthenticated: false })
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError || !profile || !profile.is_active) {
        await supabase.auth.signOut()
        await window.electronAuth.clearSession()
        set({ isLoading: false, isAuthenticated: false })
        return
      }

      set({ profile, isAuthenticated: true, isLoading: false })
    } catch {
      await window.electronAuth.clearSession()
      set({ isLoading: false, isAuthenticated: false })
    }
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error: 'Credenciales incorrectas' }
    }

    try {
      await window.electronAuth.saveSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      await supabase.auth.signOut()
      if (message.includes('SAFE_STORAGE_UNAVAILABLE')) {
        return { error: 'No se puede guardar la sesión: cifrado del sistema no disponible. Contacta al administrador.' }
      }
      return { error: 'No se pudo guardar la sesión. Reinicia la app e intenta de nuevo.' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) {
      await supabase.auth.signOut()
      await window.electronAuth.clearSession()
      return { error: 'Error al cargar perfil. Contacta a un administrador.' }
    }

    if (!profile) {
      await supabase.auth.signOut()
      await window.electronAuth.clearSession()
      return { error: 'No existe un perfil asociado a esta cuenta. Contacta a un administrador.' }
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      await window.electronAuth.clearSession()
      return { error: 'Cuenta desactivada' }
    }

    await supabase.from('audit_logs').insert({
      user_id: data.user.id,
      user_email: data.user.email ?? '',
      action: 'LOGIN',
      entity_type: 'session',
      entity_id: data.user.id,
    })

    set({ profile, isAuthenticated: true })
    return { error: null }
  },

  logout: async () => {
    const { profile } = get()
    if (profile) {
      await supabase.from('audit_logs').insert({
        user_id: profile.id,
        user_email: profile.email,
        action: 'LOGOUT',
        entity_type: 'session',
        entity_id: profile.id,
      })
    }
    await supabase.auth.signOut()
    await window.electronAuth.clearSession()
    useSessionStore.getState().clear()
    set({ profile: null, isAuthenticated: false })
  },
}))
