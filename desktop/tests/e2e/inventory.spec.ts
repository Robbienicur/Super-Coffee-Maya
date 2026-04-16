import { test, expect } from '@playwright/test'
import { launchApp, loginAs } from './helpers/launch'

test.describe('Inventario (admin)', () => {
  test('admin puede abrir la página de inventario y ver productos E2E', async () => {
    const { window, cleanup } = await launchApp()

    await loginAs(window, 'admin')
    await window.getByText(/inventario/i).first().click()

    await expect(window.getByText(/Producto E2E Café/i)).toBeVisible({ timeout: 10_000 })
    await expect(window.getByText(/Producto E2E Bebida/i)).toBeVisible()

    await cleanup()
  })

  test('cajera no tiene acceso a inventario', async () => {
    const { window, cleanup } = await launchApp()

    await loginAs(window, 'cashier')
    await window.waitForTimeout(1500)

    const inventoryLink = window.getByText(/inventario/i).first()
    const count = await inventoryLink.count()
    expect(count).toBe(0)

    await cleanup()
  })
})
