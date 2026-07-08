const { app, BrowserWindow, clipboard, ipcMain, protocol, Menu } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const settingsStore = require('./settingsStore')
const db = require('./db')
const chatStore = require('./chatStore')
const imageCache = require('./imageCache')
const { summarizeArticle, streamChat } = require('./llm')

const SIDECAR_PORT = 8787
const SIDECAR_URL = `http://127.0.0.1:${SIDECAR_PORT}`
const URL_RE = /^https?:\/\/\S+$/i
const CLIPBOARD_POLL_MS = 1500

protocol.registerSchemesAsPrivileged([
  { scheme: 'appimg', privileges: { standard: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
])

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

function broadcastChatEvent(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('chat:event', payload)
  }
}

async function processLink(url) {
  const data = { processing: true, stage: 'Fetching article...' }
  let id
  try {
    id = await db.insertContent({ url, tag: 'Article', data })
  } catch (e) {
    console.error('[processLink] insertContent failed:', e)
    return
  }
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
    chatStore.deleteSession(id)
    broadcastQueueUpdate()
  })
  ipcMain.handle('contents:cancel', async (_event, id) => {
    activeJobs.get(id)?.abort()
    await db.discard(id)
    broadcastQueueUpdate()
  })

  ipcMain.handle('chat:get', (_event, contentId) => chatStore.getSession(contentId))
  ipcMain.handle('chat:list', () => chatStore.listSessions())
  ipcMain.handle('chat:delete', (_event, contentId) => chatStore.deleteSession(contentId))
  ipcMain.handle('chat:send', async (_event, contentId, { text, provider, articleText }) => {
    chatStore.appendMessage(contentId, { role: 'user', content: text, createdAt: new Date().toISOString() })
    chatStore.setProvider(contentId, provider)

    const settings = settingsStore.getSettings()
    const session = chatStore.getSession(contentId)
    try {
      const reply = await streamChat(
        provider,
        articleText,
        session.messages,
        settings.models[provider],
        settings.apiKeys,
        (chunk) => broadcastChatEvent({ type: 'chunk', contentId, chunk })
      )
      chatStore.appendMessage(contentId, { role: 'assistant', content: reply, createdAt: new Date().toISOString() })
      broadcastChatEvent({ type: 'done', contentId })
    } catch (e) {
      console.error('[chat:send] failed:', e)
      broadcastChatEvent({ type: 'error', contentId, error: e instanceof Error ? e.message : String(e) })
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    autoHideMenuBar: true,
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
  Menu.setApplicationMenu(null)
  protocol.handle('appimg', imageCache.fetchImage)
  registerIpcHandlers()
  startSidecar()
  await db.resetStuckJobs().catch((e) => console.error('[db] resetStuckJobs failed:', e.message))
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
