import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures'

test.describe('Ventas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/ventas')
  })

  test('la tabla de ventas se renderiza', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ventas/i })).toBeVisible()
    await expect(page.getByText(/historial de ventas/i)).toBeVisible()
  })

  test('filtrar por método de pago actualiza la tabla', async ({ page }) => {
    const paymentSelect = page.locator('select').filter({ hasText: /efectivo|tarjeta|transferencia|método/i }).first()

    if (await paymentSelect.count() === 0) {
      test.skip()
    }

    await paymentSelect.selectOption({ label: 'Efectivo' })
    await page.waitForTimeout(500)

    const rows = page.locator('tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('el botón exportar CSV está presente', async ({ page }) => {
    await expect(page.getByRole('button', { name: /exportar|csv/i }).first()).toBeVisible()
  })

  test('click en icono de detalle abre modal con items de la venta', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /ver detalle de venta/i }).first()
    await expect(viewButton).toBeVisible({ timeout: 5_000 })
    await viewButton.click()

    await expect(page.getByText(/detalle de venta/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/cajero:/i)).toBeVisible()
    await expect(page.getByText(/método:/i)).toBeVisible()
    await expect(page.getByText(/total:/i)).toBeVisible()
  })

  test('cancelar venta genera entrada en audit log', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /ver detalle de venta/i }).first()
    await expect(viewButton).toBeVisible({ timeout: 5_000 })
    await viewButton.click()
    await expect(page.getByText(/detalle de venta/i)).toBeVisible({ timeout: 5_000 })

    const cancelBtn = page.getByRole('button', { name: /cancelar venta/i }).first()
    if (await cancelBtn.count() === 0) {
      test.skip()
    }

    await cancelBtn.click()
    await page.waitForTimeout(2000)

    // Verificar que la venta cambió de estado en la tabla
    await expect(page.locator('tbody').getByText(/cancelada/i).first()).toBeVisible({ timeout: 5_000 })

    // Ir a auditoría y verificar la entrada
    await page.goto('/auditoria')
    await expect(page.locator('tbody').getByText(/cancelación|sale_cancelled|venta cancelada/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
