import { test, expect } from '@playwright/test'
import { launchApp, loginAs } from './helpers/launch'

test.describe('Inventario (admin)', () => {
  test('admin puede abrir la página de inventario y ver productos E2E', async () => {
    const { window, cleanup } = await launchApp()

    await loginAs(window, 'admin')
    await window.getByRole('button', { name: /inventario/i }).click()

    await expect(window.getByText(/Producto E2E Café/i)).toBeVisible({ timeout: 10_000 })
    await expect(window.getByText(/Producto E2E Bebida/i)).toBeVisible()

    await cleanup()
  })

  test('admin edita precio de producto y genera entrada PRICE_CHANGED en auditoría', async () => {
    const { window, cleanup } = await launchApp()

    await loginAs(window, 'admin')
    await window.getByRole('button', { name: /inventario/i }).click()

    await expect(window.getByText(/Producto E2E Café/i)).toBeVisible({ timeout: 10_000 })

    // Click editar en el primer producto E2E
    const row = window.locator('tr:has-text("E2E00001")')
    const editBtn = row.getByRole('button', { name: /editar/i }).first()
    await editBtn.click()

    // Esperar modal de edición
    const modal = window.getByRole('heading', { name: /editar producto/i }).locator('..')
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Cambiar precio de venta (primer input con step="0.01")
    const precioInput = window.locator('input[step="0.01"]').first()
    await precioInput.fill('99.99')

    // Guardar cambios
    await window.getByRole('button', { name: /guardar cambios/i }).click()

    // Esperar que el modal se cierre
    await expect(window.getByRole('heading', { name: /editar producto/i })).toBeHidden({ timeout: 5_000 })

    // Navegar a auditoría y verificar entrada PRICE_CHANGED en la tabla
    await window.getByRole('button', { name: /auditoría/i }).click()
    await expect(window.locator('tbody').getByText(/precio cambiado/i).first()).toBeVisible({ timeout: 10_000 })

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
