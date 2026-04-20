import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAuth', {
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  saveSession: (tokens: { access_token: string; refresh_token: string }) =>
    ipcRenderer.invoke('auth:save-session', tokens),
  clearSession: () => ipcRenderer.invoke('auth:clear-session'),
})

export type UpdateEvent =
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'none' }
  | { status: 'error'; message: string }

contextBridge.exposeInMainWorld('electronUpdater', {
  onEvent: (callback: (event: UpdateEvent) => void) => {
    const handler = (_: unknown, event: UpdateEvent) => callback(event)
    ipcRenderer.on('update:event', handler)
    return () => ipcRenderer.removeListener('update:event', handler)
  },
  installNow: () => ipcRenderer.invoke('update:install-now'),
})
