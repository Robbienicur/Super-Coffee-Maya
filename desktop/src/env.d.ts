/// <reference types="electron-vite/client" />

import type { UpdateEvent } from './preload'

interface ElectronAuthAPI {
  getSession: () => Promise<{ access_token: string; refresh_token: string } | null>
  saveSession: (tokens: { access_token: string; refresh_token: string }) => Promise<void>
  clearSession: () => Promise<void>
}

interface ElectronUpdaterAPI {
  onEvent: (callback: (event: UpdateEvent) => void) => () => void
  installNow: () => Promise<void>
}

declare global {
  interface Window {
    electronAuth: ElectronAuthAPI
    electronUpdater: ElectronUpdaterAPI
  }
}

export {}
