const { app, BrowserWindow, clipboard, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const settingsStore = require('./settingsStore')
const db = require('./db')
const { summarizeArticle } = require('./llm')

const SIDECAR_PORT = 8787
const SIDECAR_URL = `http://127.0.0.1:${SIDECAR_PORT}`
const URL_RE = /^https?:\/\/\S+$/i
const CLIPBOARD_POLL_MS = 1500

let sidecarProcess = null
let lastClipboardText = ''
let mainWindow = null
const activeJobs = new Map()

function computeOptionKey(options) {
  const parts = []
  if (options.emoji) parts.push('emoji')
  if (options.kidFriendly) parts.push('child')
  return parts.length ? parts.join('_') : 'default'
}

function startSidecar() {
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3'
  sidecarProcess = spawn(pythonBin, ['-m', 'uvicorn', 'main:app', '--port', String(SIDECAR_PORT)], {
    cwd: path.join(__dirname, '..', 'python-sidecar'),
    stdio: 'ignore',
  })
  sidecarProcess.on('error', (e) => console.error('[sidecar] failed to start:', e))
}

async function crawl(url, signal) {
  try {
    const res = await fetch(`${SIDECAR_URL}/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.any([AbortSignal.timeout(30_000), signal]),
    })
    if (!res.ok) return { success: false, text: null }
    return await res.json()
  } catch (e) {
    console.error('[crawl] sidecar unreachable:', e)
    return { success: false, text: null }
  }
}

function broadcastQueueUpdate() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('queue:updated')
  }
}

async function processLink(url) {
  const data = { processing: true, stage: 'Fetching article...' }
  const id = await db.insertContent({ url, tag: 'Article', data })
  broadcastQueueUpdate()

  const controller = new AbortController()
  activeJobs.set(id, controller)
  let tag = 'Article'

  try {
    const { success, text, image } = await crawl(url, controller.signal)
    if (controller.signal.aborted) return

    if (!success || !text) {
      tag = 'Not Article'
      return
    }

    data.original = text
    data.thumbnail = image ?? null
    data.summaries = {}
    data.stage = 'Summarizing...'
    await db.updateContent(id, { data })
    broadcastQueueUpdate()

    const settings = settingsStore.getSettings()
    const { category, summary } = await summarizeArticle(
      text,
      settings.defaultOptions,
      settings.defaultProvider,
      settings.models[settings.defaultProvider],
      settings.apiKeys,
      controller.signal,
      settings.categories
    )
    data.category = category
    data.summaries[computeOptionKey(settings.defaultOptions)] = summary
  } catch (e) {
    if (controller.signal.aborted) return
    console.error('[processLink] failed:', e)
    data.error = e instanceof Error ? e.message : String(e)
  } finally {
    if (!controller.signal.aborted) {
      data.processing = false
      delete data.stage
      await db.updateContent(id, { tag, data })
      broadcastQueueUpdate()
    }
    activeJobs.delete(id)
  }
}

function watchClipboard() {
  lastClipboardText = clipboard.readText()
  setInterval(() => {
    const text = clipboard.readText().trim()
    if (!text || text === lastClipboardText) return
    lastClipboardText = text
    if (URL_RE.test(text)) processLink(text)
  }, CLIPBOARD_POLL_MS)
}

function registerIpcHandlers() {
  ipcMain.handle('settings:get', () => settingsStore.getSettings())
  ipcMain.handle('settings:sync', (_event, partial) => settingsStore.updateSettings(partial))
  ipcMain.handle('contents:list', (_event, status) => db.listByStatus(status))
  ipcMain.handle('contents:approve', async (_event, id) => {
    const { activeFolder } = settingsStore.getSettings()
    await db.approve(id, activeFolder)
    broadcastQueueUpdate()
  })
  ipcMain.handle('contents:discard', async (_event, id) => {
    await db.discard(id)
    broadcastQueueUpdate()
  })
  ipcMain.handle('contents:cancel', async (_event, id) => {
    activeJobs.get(id)?.abort()
    await db.discard(id)
    broadcastQueueUpdate()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers()
  startSidecar()
  await db.resetStuckJobs()
  createWindow()
  watchClipboard()

  // setTimeout(()=>{
  // processLink(`https://www.koreaherald.com/article/10802438`)
  // }, 5000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  if (sidecarProcess) sidecarProcess.kill()
})
