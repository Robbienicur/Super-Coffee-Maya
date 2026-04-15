import { createClient } from '@/lib/supabase/client'
import type { AuditLog, Database } from '@/types/database'

type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

export async function insertAuditLog(
  action: string,
  entityType: AuditLog['entity_type'],
  entityId: string,
  oldValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const payload: AuditLogInsert = {
    user_id: user.id,
    user_email: user.email ?? '',
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
  }

  // @ts-expect-error: supabase-js v2.103 schema inference doesn't resolve correctly with manually written Database types
  await supabase.from('audit_logs').insert(payload)
}
