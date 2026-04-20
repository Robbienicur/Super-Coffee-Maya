/// <reference types="electron-vite/client" />

interface ElectronAuthAPI {
  getSession: () => Promise<{ access_token: string; refresh_token: string } | null>
  saveSession: (tokens: { access_token: string; refresh_token: string }) => Promise<void>
  clearSession: () => Promise<void>
}

type UpdateEvent =
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'none' }
  | { status: 'error'; message: string }

interface ElectronUpdaterAPI {
  onEvent: (callback: (event: UpdateEvent) => void) => () => void
  installNow: () => Promise<void>
}

interface Window {
  electronAuth: ElectronAuthAPI
  electronUpdater: ElectronUpdaterAPI
}
