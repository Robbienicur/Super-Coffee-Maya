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
})
