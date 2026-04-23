// Preload en CommonJS (no ESM) para que funcione bajo sandbox:true.
// electron-vite bundlea main y renderer como ESM, pero el sandbox de Electron
// requiere que el preload sea cargable via require(). Este archivo se copia
// tal cual a out/preload/index.cjs en el build (ver scripts/copy-preload.mjs).
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAuth', {
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  saveSession: (tokens) => ipcRenderer.invoke('auth:save-session', tokens),
  clearSession: () => ipcRenderer.invoke('auth:clear-session'),
})

contextBridge.exposeInMainWorld('electronUpdater', {
  onEvent: (callback) => {
    const handler = (_, event) => callback(event)
    ipcRenderer.on('update:event', handler)
    return () => ipcRenderer.removeListener('update:event', handler)
  },
  installNow: () => ipcRenderer.invoke('update:install-now'),
})
