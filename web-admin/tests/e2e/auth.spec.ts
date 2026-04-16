import { test, expect } from '@playwright/test'
import { loginAs } from './fixtures'

test.describe('Autenticación', () => {
  test('admin válido accede al dashboard', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /dashboard|ventas|resumen/i }).first()).toBeVisible()
  })

  test('cajera no-admin es redirigida a /no-autorizado', async ({ page }) => {
    await loginAs(page, 'cashier')
    await expect(page).toHaveURL(/\/no-autorizado/)
  })

  test('credenciales inválidas muestran error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill('no-existe@coffemaya.test')
    await page.getByLabel('Contraseña').fill('password-invalida')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    await expect(page.getByText(/credenciales incorrectas/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})
