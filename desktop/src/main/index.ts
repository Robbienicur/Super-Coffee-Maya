import { app, BrowserWindow, ipcMain, safeStorage, session } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

// Store sin encryptionKey: sólo guarda blobs ya cifrados con safeStorage.
// El flag safe_storage diferencia sesiones del modo strict (post-FASE 12.1)
// de las legacy en plain text, que ahora se descartan.
const store = new Store<{
  access_token?: string
  refresh_token?: string
  safe_storage?: boolean
}>()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  mainWindow.on('closed', () => { mainWindow = null })

  // Bloquear navegación a URLs externas: el renderer solo puede cargar el bundle local
  // o el dev server de Vite. Cualquier link clickeable a un dominio externo se cancela.
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    const allowed = url.startsWith('file://') || (!!rendererUrl && url.startsWith(rendererUrl))
    if (!allowed) e.preventDefault()
  })

  // Bloquear window.open() y target="_blank" — no abrimos ventanas hijas
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (process.env.NODE_ENV === 'development' && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

type UpdateEvent =
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'none' }
  | { status: 'error'; message: string }

function emitUpdateEvent(event: UpdateEvent): void {
  mainWindow?.webContents.send('update:event', event)
}

function encryptToken(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('SAFE_STORAGE_UNAVAILABLE')
  }
  return safeStorage.encryptString(plain).toString('base64')
}

function decryptToken(stored: string | undefined, wasEncrypted: boolean): string | undefined {
  if (!stored) return undefined
  // Sesiones legacy guardadas en plain text (antes del strict mode) ya no son válidas:
  // las descartamos para forzar relogin con cifrado funcional.
  if (!wasEncrypted) return undefined
  if (!safeStorage.isEncryptionAvailable()) return undefined
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  } catch {
    return undefined
  }
}

ipcMain.handle('auth:get-session', () => {
  const wasEncrypted = store.get('safe_storage') === true
  const accessToken = decryptToken(store.get('access_token'), wasEncrypted)
  const refreshToken = decryptToken(store.get('refresh_token'), wasEncrypted)
  if (accessToken && refreshToken) {
    return { access_token: accessToken, refresh_token: refreshToken }
  }
  return null
})

ipcMain.handle('auth:save-session', (_event, tokens: { access_token: string; refresh_token: string }) => {
  // encryptToken lanza SAFE_STORAGE_UNAVAILABLE si no hay cifrado disponible.
  // Si llegamos a la última línea, los tokens están cifrados.
  store.set('access_token', encryptToken(tokens.access_token))
  store.set('refresh_token', encryptToken(tokens.refresh_token))
  store.set('safe_storage', true)
})

ipcMain.handle('auth:clear-session', () => {
  store.delete('access_token')
  store.delete('refresh_token')
  store.delete('safe_storage')
})

ipcMain.handle('update:install-now', () => {
  autoUpdater.quitAndInstall()
})

app.whenReady().then(() => {
  // CSP estricta solo en producción. En dev, Vite HMR necesita inline + eval.
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data:; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          ],
        },
      })
    })
  }

  createWindow()

  // autoUpdater es no-op en dev; sólo corre cuando la app está empaquetada.
  if (app.isPackaged) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => emitUpdateEvent({ status: 'checking' }))
    autoUpdater.on('update-available', (info) =>
      emitUpdateEvent({ status: 'available', version: info.version })
    )
    autoUpdater.on('update-not-available', () => emitUpdateEvent({ status: 'none' }))
    autoUpdater.on('download-progress', (p) =>
      emitUpdateEvent({ status: 'downloading', percent: Math.round(p.percent) })
    )
    autoUpdater.on('update-downloaded', (info) =>
      emitUpdateEvent({ status: 'downloaded', version: info.version })
    )
    autoUpdater.on('error', (err) =>
      emitUpdateEvent({ status: 'error', message: err.message })
    )

    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Error al buscar actualizaciones:', err)
    })
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
