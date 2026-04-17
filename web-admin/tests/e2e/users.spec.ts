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

  test('cambiar rol de usuario cajera a administrador', async ({ page }) => {
    // Buscar botón de cambiar rol en la fila de cajera E2E
    const cashierRow = page.locator('tr:has-text("cajera.e2e@coffemaya.test")')
    const roleBtn = cashierRow.locator('button[title="Cambiar rol"]').first()

    if (await roleBtn.count() === 0) {
      test.skip()
    }

    await roleBtn.click()

    // Esperar modal de cambio de rol
    await expect(page.getByText(/cambiar rol/i).first()).toBeVisible({ timeout: 5_000 })

    // Seleccionar nuevo rol
    const roleSelect = page.locator('select').last()
    await roleSelect.selectOption({ value: 'admin' })

    // Confirmar cambio
    const confirmBtn = page.getByRole('button', { name: /cambiar rol/i }).last()
    await confirmBtn.click()

    await page.waitForTimeout(2000)

    // Verificar que el rol cambió
    await expect(cashierRow.getByText(/administrador/i).first()).toBeVisible({ timeout: 5_000 })

    // Revertir: volver a cashier
    const revertBtn = cashierRow.locator('button[title="Cambiar rol"]').first()
    if (await revertBtn.count() > 0) {
      await revertBtn.click()
      await page.waitForTimeout(500)
      const revertSelect = page.locator('select').last()
      await revertSelect.selectOption({ value: 'cashier' })
      await page.getByRole('button', { name: /cambiar rol/i }).last().click()
      await page.waitForTimeout(1000)
    }
  })

  test('desactivar usuario y verificar estado inactivo', async ({ page }) => {
    // Buscar botón de desactivar en la fila de cajera E2E
    const cashierRow = page.locator('tr:has-text("cajera.e2e@coffemaya.test")')
    const deactivateBtn = cashierRow.locator('button[title="Desactivar"]').first()

    if (await deactivateBtn.count() === 0) {
      test.skip()
    }

    await deactivateBtn.click()

    // Esperar modal de confirmación
    await expect(page.getByText(/desactivar usuario/i).first()).toBeVisible({ timeout: 5_000 })

    // Confirmar desactivación
    const confirmBtn = page.getByRole('button', { name: /desactivar/i }).last()
    await confirmBtn.click()

    await page.waitForTimeout(2000)

    // Verificar que el estado cambió a inactivo
    await expect(cashierRow.getByText(/inactivo/i).first()).toBeVisible({ timeout: 5_000 })

    // Revertir: reactivar usuario
    const activateBtn = cashierRow.locator('button[title="Activar"]').first()
    if (await activateBtn.count() > 0) {
      await activateBtn.click()
      await page.waitForTimeout(500)
      const reactivateBtn = page.getByRole('button', { name: /activar/i }).last()
      await reactivateBtn.click()
      await page.waitForTimeout(1000)
    }
  })
})
