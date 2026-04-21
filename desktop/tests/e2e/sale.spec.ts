import { test, expect } from '@playwright/test'
import { launchApp, loginAs } from './helpers/launch'

test.describe('Flujo de venta', () => {
  test('escanear código E2E00001 agrega producto al carrito', async () => {
    const { window, cleanup } = await launchApp()

    await loginAs(window, 'cashier')
    await window.waitForTimeout(1500)

    for (const char of 'E2E00001') {
      await window.keyboard.type(char, { delay: 15 })
    }
    await window.keyboard.press('Enter')

    await expect(window.getByText(/Carrito \(1\)/i)).toBeVisible({ timeout: 10_000 })

    await cleanup()
  })

  test('completar venta en efectivo calcula cambio', async () => {
    const { window, cleanup } = await launchApp()

    await loginAs(window, 'cashier')
    await window.waitForTimeout(1500)

    for (const char of 'E2E00002') {
      await window.keyboard.type(char, { delay: 15 })
    }
    await window.keyboard.press('Enter')

    await expect(window.getByText(/Carrito \(1\)/i)).toBeVisible({ timeout: 10_000 })

    const cobrarButton = window.getByRole('button', { name: /cobrar/i }).first()
    await cobrarButton.click()

    await window.getByLabel(/monto recibido/i).fill('50')
    await expect(window.getByText(/cambio/i).first()).toBeVisible({ timeout: 5_000 })

    await cleanup()
  })

  test('incrementar cantidad de producto en carrito con botón +', async () => {
    const { window, cleanup } = await launchApp()

    await loginAs(window, 'cashier')
    await window.waitForTimeout(1500)

    for (const char of 'E2E00001') {
      await window.keyboard.type(char, { delay: 15 })
    }
    await window.keyboard.press('Enter')

    await expect(window.getByText(/Carrito \(1\)/i)).toBeVisible({ timeout: 10_000 })

    const plusButton = window.locator('button:has-text("+")').first()
    await plusButton.click()

    const qtySpan = window.locator('span.text-center.font-medium').first()
    await expect(qtySpan).toHaveText('2', { timeout: 3_000 })

    await cleanup()
  })

  test('completar venta descuenta stock del producto', async () => {
    const { window, cleanup } = await launchApp()

    // Login como admin para poder ver inventario después
    await loginAs(window, 'admin')
    await window.waitForTimeout(1500)

    // Ir a inventario y anotar stock actual de E2E00003
    await window.getByRole('button', { name: /inventario/i }).click()
    await expect(window.getByText(/Producto E2E Galletas/i)).toBeVisible({ timeout: 10_000 })

    const stockCell = window.locator('tr:has-text("E2E00003") td').nth(5)
    const stockBefore = await stockCell.textContent()

    // Volver a POS
    await window.getByRole('button', { name: /punto de venta/i }).click()
    await window.waitForTimeout(1000)

    // Escanear producto E2E00003
    for (const char of 'E2E00003') {
      await window.keyboard.type(char, { delay: 15 })
    }
    await window.keyboard.press('Enter')
    await expect(window.getByText(/Carrito \(1\)/i)).toBeVisible({ timeout: 10_000 })

    // Cobrar
    const cobrarBtn = window.getByRole('button', { name: /cobrar/i }).first()
    await cobrarBtn.click()

    // Llenar monto y confirmar
    await window.getByLabel(/monto recibido/i).fill('500')
    const confirmarBtn = window.getByRole('button', { name: /confirmar venta/i })
    await expect(confirmarBtn).toBeEnabled({ timeout: 5_000 })
    await confirmarBtn.click()
    await window.waitForTimeout(2000)

    // Verificar stock decrementado en inventario
    await window.getByRole('button', { name: /inventario/i }).click()
    await expect(window.getByText(/Producto E2E Galletas/i).first()).toBeVisible({ timeout: 10_000 })

    const stockAfter = await stockCell.textContent()
    const before = parseInt(stockBefore ?? '0', 10)
    const after = parseInt(stockAfter ?? '0', 10)
    expect(after).toBeLessThan(before)

    await cleanup()
  })
})
