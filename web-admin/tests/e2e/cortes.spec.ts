import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures'

test.describe('Cortes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/cortes')
  })

  test('la página de cortes carga y muestra al menos una sesión', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /cortes de caja/i })).toBeVisible()
    // El seed E2E abre una sesión para la cajera, debe aparecer como "Abierta"
    await expect(page.locator('tbody').getByText(/abierta/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('abrir detalle de un corte muestra totales de la sesión', async ({ page }) => {
    await page.getByRole('button', { name: /ver detalle del corte/i }).first().click()
    await expect(page.getByText(/detalle del corte/i)).toBeVisible()
    await expect(page.getByText(/cajera/i).first()).toBeVisible()
    await expect(page.getByText(/fondo inicial/i)).toBeVisible()
  })

  test('el botón exportar CSV está presente', async ({ page }) => {
    await expect(page.getByRole('button', { name: /exportar|csv/i }).first()).toBeVisible()
  })
})
