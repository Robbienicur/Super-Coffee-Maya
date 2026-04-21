import { expect, Page } from '@playwright/test'

type Role = 'admin' | 'cashier'

const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin.e2e@coffemaya.test',
    password: process.env.E2E_ADMIN_PASSWORD || 'e2e-admin-pass',
  },
  cashier: {
    email: process.env.E2E_CASHIER_EMAIL || 'cajera.e2e@coffemaya.test',
    password: process.env.E2E_CASHIER_PASSWORD || 'e2e-cajera-pass',
  },
}

export async function loginAs(page: Page, role: Role) {
  const { email, password } = CREDENTIALS[role]

  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

export async function expectAuthenticated(page: Page) {
  await expect(page).toHaveURL(/\/(?!login|no-autorizado)/)
}
