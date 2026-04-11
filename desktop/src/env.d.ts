/// <reference types="electron-vite/client" />

interface ElectronAuthAPI {
  getSession: () => Promise<{ access_token: string; refresh_token: string } | null>
  saveSession: (tokens: { access_token: string; refresh_token: string }) => Promise<void>
  clearSession: () => Promise<void>
}

interface Window {
  electronAuth: ElectronAuthAPI
}
