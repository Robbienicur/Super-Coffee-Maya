import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAuth', {
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  saveSession: (tokens: { access_token: string; refresh_token: string }) =>
    ipcRenderer.invoke('auth:save-session', tokens),
  clearSession: () => ipcRenderer.invoke('auth:clear-session'),
})
