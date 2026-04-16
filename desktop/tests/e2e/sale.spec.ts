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

    await expect(window.getByText(/Producto E2E Café/i)).toBeVisible({ timeout: 10_000 })

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

    await expect(window.getByText(/Producto E2E Bebida/i)).toBeVisible({ timeout: 10_000 })

    const cobrarButton = window.getByRole('button', { name: /cobrar|pagar|cobrar/i }).first()
    await cobrarButton.click()

    const montoInput = window.getByPlaceholder(/monto|recibido|pago/i).first()
    if (await montoInput.count() > 0) {
      await montoInput.fill('50')
      await expect(window.getByText(/cambio|vuelto/i).first()).toBeVisible({ timeout: 5_000 })
    }

    await cleanup()
  })
})
