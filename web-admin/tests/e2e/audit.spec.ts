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
})
