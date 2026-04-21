import { test, expect } from '@playwright/test'
import { launchApp, loginAs } from './helpers/launch'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Cierra cualquier sesión de caja abierta de la cajera E2E para que la prueba empiece limpia.
async function resetCashierSession() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: cashier } = await admin
    .from('profiles').select('id').eq('email', 'cajera.e2e@coffemaya.test').single()
  if (!cashier) return

  await admin.from('cash_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closing_cash_counted: 0,
      expected_cash: 0,
      closing_counts: { bills: {}, coins: {} },
    })
    .eq('cashier_id', cashier.id)
    .in('status', ['open', 'closing'])
}

// Los siguientes specs asumen que la cajera tiene una sesión abierta (venía del seed).
// Aquí la cerramos como parte de la prueba, así que restauramos al final.
async function reopenCashierSession() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: cashier } = await admin
    .from('profiles').select('id').eq('email', 'cajera.e2e@coffemaya.test').single()
  if (!cashier) return

  const { data: existing } = await admin
    .from('cash_sessions').select('id').eq('cashier_id', cashier.id).eq('status', 'open').limit(1)
  if (existing && existing.length > 0) return

  await admin.from('cash_sessions').insert({ cashier_id: cashier.id, opening_float: 200 })
}

test.describe('Corte de caja', () => {
  test.afterAll(async () => {
    await reopenCashierSession()
  })

  test('cajera abre caja, registra retiro y cierra con conteo', async () => {
    await resetCashierSession()

    const { window, cleanup } = await launchApp()
    await loginAs(window, 'cashier')
    await window.waitForTimeout(1500)

    // Sin sesión: el POS muestra banner "No hay caja abierta"
    await expect(window.getByText(/no hay caja abierta/i)).toBeVisible({ timeout: 10_000 })

    await window.getByRole('button', { name: /^abrir caja$/i }).click()
    await expect(window.getByRole('heading', { name: /^abrir caja$/i })).toBeVisible({ timeout: 10_000 })

    await window.locator('input[inputmode="decimal"]').first().fill('300')
    await window.getByRole('button', { name: /^abrir caja$/i }).click()

    // Dashboard de sesión abierta
    await expect(window.getByRole('heading', { name: /caja abierta/i })).toBeVisible({ timeout: 10_000 })
    await expect(window.getByText(/efectivo esperado/i)).toBeVisible()

    // Registrar un retiro
    await window.getByRole('button', { name: /^retiro$/i }).click()
    await expect(window.getByRole('heading', { name: /retiro de efectivo/i })).toBeVisible()
    await window.locator('input[inputmode="decimal"]').first().fill('100')
    await window.getByRole('textbox').nth(1).fill('A caja fuerte')
    await window.getByRole('button', { name: /registrar/i }).click()

    // El movimiento aparece en el listado
    await expect(window.getByText(/a caja fuerte/i)).toBeVisible({ timeout: 5_000 })

    // Ir a cierre
    await window.getByRole('button', { name: /^cerrar caja$/i }).click()
    await expect(window.getByRole('heading', { name: /^cerrar caja$/i })).toBeVisible()

    // Contar 200 pesos (1 billete de $200)
    const billRows = window.locator('input[type="number"]')
    await billRows.nth(2).fill('1') // $200

    // Diferencia esperada: 300 fondo - 100 drop = 200 esperado, contado 200 → diferencia 0
    await expect(window.getByText(/^cuadra$/i)).toBeVisible()

    await window.getByRole('button', { name: /confirmar corte/i }).click()

    // Reporte Z
    await expect(window.getByText(/corte de caja/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(window.getByRole('button', { name: /imprimir/i })).toBeVisible()

    await cleanup()
  })
})
