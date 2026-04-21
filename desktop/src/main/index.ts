import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

// Store sin encryptionKey: sólo guarda blobs ya cifrados con safeStorage
// (o texto plano como fallback si safeStorage no está disponible).
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
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  mainWindow.on('closed', () => { mainWindow = null })

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
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(plain).toString('base64')
  }
  console.warn('safeStorage no disponible: token guardado sin cifrar')
  return plain
}

function decryptToken(stored: string | undefined, wasEncrypted: boolean): string | undefined {
  if (!stored) return undefined
  if (wasEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(stored, 'base64'))
    } catch {
      return undefined
    }
  }
  return stored
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
  const encrypted = safeStorage.isEncryptionAvailable()
  store.set('access_token', encryptToken(tokens.access_token))
  store.set('refresh_token', encryptToken(tokens.refresh_token))
  store.set('safe_storage', encrypted)
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
