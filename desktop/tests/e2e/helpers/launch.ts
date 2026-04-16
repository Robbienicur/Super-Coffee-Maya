import { _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

export type LaunchedApp = {
  app: ElectronApplication
  window: Page
  userDataDir: string
  cleanup: () => Promise<void>
}

const MAIN_ENTRY = path.resolve(__dirname, '../../../out/main/index.js')

export async function launchApp(): Promise<LaunchedApp> {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'coffe-maya-e2e-'))

  const app = await electron.launch({
    args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
    timeout: 30_000,
  })

  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  const cleanup = async () => {
    await app.close().catch(() => {})
    rmSync(userDataDir, { recursive: true, force: true })
  }

  return { app, window, userDataDir, cleanup }
}

export const E2E_CREDENTIALS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin.e2e@coffemaya.test',
    password: process.env.E2E_ADMIN_PASSWORD || 'e2e-admin-pass',
  },
  cashier: {
    email: process.env.E2E_CASHIER_EMAIL || 'cajera.e2e@coffemaya.test',
    password: process.env.E2E_CASHIER_PASSWORD || 'e2e-cajera-pass',
  },
}

export async function loginAs(window: Page, role: 'admin' | 'cashier') {
  const { email, password } = E2E_CREDENTIALS[role]
  await window.getByPlaceholder(/correo@ejemplo\.com/i).fill(email)
  await window.getByPlaceholder(/••••/).fill(password)
  await window.getByRole('button', { name: /iniciar sesión/i }).click()
}
