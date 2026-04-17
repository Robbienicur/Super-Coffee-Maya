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

  test('admin edita precio de producto y genera entrada PRICE_CHANGED en auditoría', async () => {
    const { window, cleanup } = await launchApp()

    await loginAs(window, 'admin')
    await window.getByText(/inventario/i).first().click()

    await expect(window.getByText(/Producto E2E Café/i)).toBeVisible({ timeout: 10_000 })

    // Click editar en el primer producto E2E
    const row = window.locator('tr:has-text("E2E00001")')
    const editBtn = row.getByRole('button', { name: /editar/i }).first()
    await editBtn.click()

    // Esperar modal de edición
    await expect(window.getByText(/editar producto/i)).toBeVisible({ timeout: 5_000 })

    // Cambiar precio de venta
    const precioInput = window.locator('label:has-text("Precio de venta") + input, label:has-text("Precio de venta") ~ input').first()
    if (await precioInput.count() === 0) {
      // Fallback: buscar input por placeholder
      const altInput = window.locator('input[step="0.01"]').first()
      await altInput.clear()
      await altInput.fill('99.99')
    } else {
      await precioInput.clear()
      await precioInput.fill('99.99')
    }

    // Guardar cambios
    const guardarBtn = window.getByRole('button', { name: /guardar cambios/i }).first()
    await guardarBtn.click()

    await window.waitForTimeout(2000)

    // Navegar a auditoría y verificar entrada PRICE_CHANGED
    await window.getByText(/auditoría/i).first().click()
    await expect(window.getByText(/precio cambiado/i).first()).toBeVisible({ timeout: 10_000 })

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
