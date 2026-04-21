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

async function ensureOpenSession(cashierId) {
  const { data: existing } = await supabase
    .from('cash_sessions')
    .select('id')
    .eq('cashier_id', cashierId)
    .eq('status', 'open')
    .limit(1)

  if (existing && existing.length > 0) {
    return existing[0].id
  }

  const { data: newSession, error } = await supabase
    .from('cash_sessions')
    .insert({ cashier_id: cashierId, opening_float: 200.00 })
    .select()
    .single()
  if (error) throw error
  console.log(`- sesión de caja abierta (id ${newSession.id})`)
  return newSession.id
}

async function seedSampleSale() {
  // Inserta una venta determinista para tests E2E de web-admin
  // (detalle de venta, cancelar venta, etc.)
  const { data: cashier } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'cajera.e2e@coffemaya.test')
    .single()

  if (!cashier) {
    console.log('- no se encontró cajera E2E, se omite venta demo')
    return
  }

  const { data: existing } = await supabase
    .from('sales')
    .select('id')
    .eq('cashier_id', cashier.id)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`- venta demo ya existe (id ${existing[0].id}), se omite`)
    return
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, price')
    .eq('barcode', 'E2E00001')
    .single()

  if (!product) {
    console.log('- producto E2E00001 no encontrado, se omite venta demo')
    return
  }

  const sessionId = await ensureOpenSession(cashier.id)

  const unitPrice = Number(product.price)
  const total = unitPrice

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      cashier_id: cashier.id,
      session_id: sessionId,
      total,
      discount_amount: 0,
      payment_method: 'cash',
      amount_paid: 100.00,
      change_given: 100.00 - total,
      status: 'completed',
    })
    .select()
    .single()

  if (saleError) throw saleError

  const { error: itemError } = await supabase
    .from('sale_items')
    .insert({
      sale_id: sale.id,
      product_id: product.id,
      quantity: 1,
      unit_price: unitPrice,
      subtotal: unitPrice,
    })

  if (itemError) throw itemError

  console.log(`- venta demo creada (id ${sale.id}, total $${total.toFixed(2)})`)
}

async function seedSampleAuditLog() {
  // Audit log determinista para tests de CSV export y de diff expandible.
  const { data: admin } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'admin.e2e@coffemaya.test')
    .single()

  if (!admin) {
    console.log('- admin E2E no encontrado, se omite audit demo')
    return
  }

  const { data: existing } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('user_id', admin.id)
    .eq('action', 'PRICE_CHANGED')
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`- audit demo ya existe (id ${existing[0].id}), se omite`)
    return
  }

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('barcode', 'E2E00002')
    .single()

  const { data: log, error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: admin.id,
      action: 'PRICE_CHANGED',
      entity_type: 'product',
      entity_id: product?.id ?? null,
      old_value: { price: 25.00 },
      new_value: { price: 27.50 },
    })
    .select()
    .single()

  if (error) throw error

  console.log(`- audit demo creado (id ${log.id}, action PRICE_CHANGED)`)
}

async function main() {
  console.log(`Seeding usuarios E2E en ${SUPABASE_URL}`)
  for (const user of users) {
    await ensureUser(user)
  }

  // Abrir una caja para cada usuario E2E así los tests de venta corren sin setup adicional.
  for (const email of ['cajera.e2e@coffemaya.test', 'admin.e2e@coffemaya.test']) {
    const { data } = await supabase.from('profiles').select('id').eq('email', email).single()
    if (data) await ensureOpenSession(data.id)
  }

  await seedSampleSale()
  await seedSampleAuditLog()
  console.log('Listo.')
}

main().catch((err) => {
  console.error('Error al sembrar usuarios E2E:', err)
  process.exit(1)
})
