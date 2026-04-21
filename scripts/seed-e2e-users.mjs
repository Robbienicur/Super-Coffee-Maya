#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
  || 'http://127.0.0.1:54321'

// Service role key local estándar de Supabase CLI.
// Es la misma en cualquier instancia local y está públicamente documentada.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const users = [
  {
    email: 'admin.e2e@coffemaya.test',
    password: 'e2e-admin-pass',
    user_metadata: { name: 'Admin E2E', role: 'admin' },
  },
  {
    email: 'cajera.e2e@coffemaya.test',
    password: 'e2e-cajera-pass',
    user_metadata: { name: 'Cajera E2E', role: 'cashier' },
  },
]

async function ensureUser({ email, password, user_metadata }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata,
  })

  if (error) {
    if (error.message.includes('already') || error.status === 422) {
      console.log(`- ${email}: ya existe, se omite`)
      return
    }
    throw error
  }

  // handle_new_user siempre crea como 'cashier'. Si pedimos admin, lo promovemos via service_role.
  if (user_metadata.role && user_metadata.role !== 'cashier') {
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: user_metadata.role })
      .eq('id', data.user.id)
    if (roleError) throw roleError
  }

  console.log(`- ${email}: creado (id ${data.user.id}, rol ${user_metadata.role})`)
}

async function main() {
  console.log(`Seeding usuarios E2E en ${SUPABASE_URL}`)
  for (const user of users) {
    await ensureUser(user)
  }
  console.log('Listo.')
}

main().catch((err) => {
  console.error('Error al sembrar usuarios E2E:', err)
  process.exit(1)
})
