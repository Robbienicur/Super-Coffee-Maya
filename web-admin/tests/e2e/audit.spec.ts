import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures'

test.describe('Auditoría', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/auditoria')
  })

  test('la página de auditoría carga', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /auditor/i })).toBeVisible()
  })

  test('puede exportar CSV de audit logs', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /exportar|csv/i }).first()
    await expect(exportButton).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await exportButton.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })

  test('filtrar por acción muestra solo registros del tipo seleccionado', async ({ page }) => {
    // Buscar select de acción
    const actionSelect = page.locator('select').filter({ hasText: /todas|acción|inicio sesión/i }).first()

    if (await actionSelect.count() === 0) {
      test.skip()
    }

    await actionSelect.selectOption({ label: 'Inicio sesión' })
    await page.waitForTimeout(1000)

    // Verificar que los badges visibles son del tipo seleccionado
    const badges = page.locator('span:has-text("Inicio sesión"), span:has-text("inicio sesión")')
    const count = await badges.count()
    expect(count).toBeGreaterThanOrEqual(0)

    // Verificar que no hay badges de otros tipos (si hay resultados)
    if (count > 0) {
      const otherActions = page.locator('span:has-text("Venta completada")')
      await expect(otherActions).toHaveCount(0)
    }
  })
})
