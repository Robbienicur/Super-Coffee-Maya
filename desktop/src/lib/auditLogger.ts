import supabase from './supabaseClient'
import { useAuthStore } from '../store/authStore'

export async function logAction(
  action: string,
  entityType: 'product' | 'sale' | 'user' | 'session' | 'system',
  entityId?: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>
): Promise<void> {
  const profile = useAuthStore.getState().profile
  if (!profile) return

  await supabase.from('audit_logs').insert({
    user_id: profile.id,
    user_email: profile.email,
    action,
    entity_type: entityType,
    entity_id: entityId ?? '',
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
  })
}
