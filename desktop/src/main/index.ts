import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

const store = new Store({
  encryptionKey: 'coffe-maya-pos-session',
})

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

ipcMain.handle('auth:get-session', () => {
  const accessToken = store.get('access_token') as string | undefined
  const refreshToken = store.get('refresh_token') as string | undefined
  if (accessToken && refreshToken) {
    return { access_token: accessToken, refresh_token: refreshToken }
  }
  return null
})

ipcMain.handle('auth:save-session', (_event, tokens: { access_token: string; refresh_token: string }) => {
  store.set('access_token', tokens.access_token)
  store.set('refresh_token', tokens.refresh_token)
})

ipcMain.handle('auth:clear-session', () => {
  store.delete('access_token')
  store.delete('refresh_token')
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
