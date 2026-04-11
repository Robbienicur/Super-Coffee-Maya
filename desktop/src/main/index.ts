import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import Store from 'electron-store'

const store = new Store({
  encryptionKey: 'coffe-maya-pos-session',
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
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
    mainWindow.maximize()
    mainWindow.show()
  })

  if (process.env.NODE_ENV === 'development' && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
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

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
