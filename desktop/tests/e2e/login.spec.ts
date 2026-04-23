import { test, expect } from '@playwright/test'
import { launchApp, loginAs } from './helpers/launch'

test.describe('Login desktop', () => {
  test('cajera con credenciales válidas llega al POS', async () => {
    const { window, cleanup } = await launchApp()

    await expect(window.getByRole('heading', { name: /super coffee maya/i })).toBeVisible()
    await loginAs(window, 'cashier')

    await expect(window.getByText(/punto de venta|POS|carrito/i).first()).toBeVisible({ timeout: 10_000 })

    await cleanup()
  })

  test('admin tiene acceso a sidebar completo', async () => {
    const { window, cleanup } = await launchApp()

    await loginAs(window, 'admin')
    await expect(window.getByRole('button', { name: 'Inventario', exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(window.getByRole('button', { name: 'Auditoría', exact: true })).toBeVisible()

    await cleanup()
  })

  test('credenciales inválidas muestran error', async () => {
    const { window, cleanup } = await launchApp()

    await window.getByPlaceholder(/correo@ejemplo\.com/i).fill('noexiste@coffemaya.test')
    await window.getByPlaceholder(/••••/).fill('password-mal')
    await window.getByRole('button', { name: /iniciar sesión/i }).click()

    await expect(window.getByText(/credenciales|incorrect|inválid/i).first()).toBeVisible({ timeout: 10_000 })

    await cleanup()
  })
})
