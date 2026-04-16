import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures'

const RANDOM_SUFFIX = Date.now()
const NEW_USER_EMAIL = `cajera.nueva.${RANDOM_SUFFIX}@coffemaya.test`

test.describe('Usuarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/usuarios')
  })

  test('la página de usuarios carga y lista a los seeds', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /usuarios/i })).toBeVisible()
    await expect(page.getByText('admin.e2e@coffemaya.test')).toBeVisible()
    await expect(page.getByText('cajera.e2e@coffemaya.test')).toBeVisible()
  })

  test('crear usuario nuevo con rol cashier', async ({ page }) => {
    await page.getByRole('button', { name: /crear|nuevo|agregar/i }).first().click()

    await page.getByLabel(/correo|email/i).fill(NEW_USER_EMAIL)
    await page.getByLabel(/nombre/i).fill('Cajera Nueva E2E')
    await page.getByLabel(/contraseña|password/i).fill('nuevo-pass-123')

    await page.getByRole('button', { name: /crear|guardar|confirmar/i }).last().click()

    await expect(page.getByText(NEW_USER_EMAIL)).toBeVisible({ timeout: 10_000 })
  })
})
