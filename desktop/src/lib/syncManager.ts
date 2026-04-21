import supabase from './supabaseClient'
import {
  getPendingSales,
  markPendingSaleFailed,
  removePendingSale,
  type PendingSale,
} from './offlineQueue'

let syncing = false

// Intenta insertar todas las ventas pendientes. Retorna cuántas sincronizó.
// Una falla individual no corta al resto; cada venta es atómica.
export async function drainPendingSales(): Promise<number> {
  if (syncing) return 0
  syncing = true

  let synced = 0
  try {
    const pending = getPendingSales()
    for (const sale of pending) {
      const ok = await pushOne(sale)
      if (ok) {
        await removePendingSale(sale.tempId)
        synced += 1
      } else {
        await markPendingSaleFailed(sale.tempId)
      }
    }
  } finally {
    syncing = false
  }
  return synced
}

async function pushOne(sale: PendingSale): Promise<boolean> {
  // Idempotencia: si ya existe una venta con el mismo client_sale_id, la damos por sincronizada.
  if (sale.client_sale_id) {
    const { data: existing } = await supabase
      .from('sales')
      .select('id')
      .like('notes', `client_sale_id:${sale.client_sale_id}%`)
      .limit(1)

    if (existing && existing.length > 0) {
      return true
    }
  }

  const noteParts = [
    sale.client_sale_id ? `client_sale_id:${sale.client_sale_id}` : '',
    `sync offline ${sale.created_at_local}`,
  ].filter(Boolean)

  const { data, error } = await supabase
    .from('sales')
    .insert({
      cashier_id: sale.cashier_id,
      total: sale.total,
      discount_amount: 0,
      payment_method: sale.payment_method,
      amount_paid: sale.amount_paid,
      change_given: sale.change_given,
      status: 'completed' as const,
      notes: noteParts.join(' | '),
    })
    .select('id')
    .single()

  if (error || !data) return false

  const items = sale.items.map((it) => ({
    sale_id: data.id,
    product_id: it.product_id,
    quantity: it.quantity,
    unit_price: it.unit_price,
    subtotal: it.subtotal,
  }))

  const { error: itemsError } = await supabase.from('sale_items').insert(items)
  if (itemsError) {
    // limpiamos la venta huérfana para no contar doble al reintentar
    await supabase.from('sales').update({ status: 'cancelled' as const }).eq('id', data.id)
    return false
  }

  await supabase.from('audit_logs').insert({
    user_id: sale.cashier_id,
    user_email: sale.cashier_email,
    action: 'SALE_COMPLETED',
    entity_type: 'sale' as const,
    entity_id: data.id,
    old_value: null,
    new_value: {
      total: sale.total,
      items_count: sale.items.length,
      payment_method: sale.payment_method,
      amount_paid: sale.amount_paid,
      change_given: sale.change_given,
      synced_from_offline: true,
      original_created_at_local: sale.created_at_local,
      client_sale_id: sale.client_sale_id,
    },
  })

  return true
}
