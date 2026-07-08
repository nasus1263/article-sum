const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')
const { app } = require('electron')

let db = null

function dbPath() {
  return path.join(app.getPath('userData'), 'article-sum.sqlite')
}

async function getDb() {
  if (db) return db
  const SQL = await initSqlJs()
  const file = dbPath()
  db = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database()
  db.run(`CREATE TABLE IF NOT EXISTS contents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    tag TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`)
  return db
}

function persist() {
  fs.writeFileSync(dbPath(), Buffer.from(db.export()))
}

async function insertContent({ url, tag, data }) {
  const d = await getDb()
  d.run(`INSERT INTO contents (url, tag, status, data, created_at) VALUES (?, ?, 'pending', ?, ?)`, [
    url,
    tag,
    JSON.stringify(data ?? {}),
    new Date().toISOString(),
  ])
  // persist() 는 db.export() 를 호출하는데, 이게 last_insert_rowid() 를 0 으로 리셋한다.
  // 따라서 id 를 먼저 읽고 persist 한다.
  const [{ values }] = d.exec('SELECT last_insert_rowid()')
  const id = values[0][0]
  persist()
  return id
}

async function updateContent(id, { tag, data }) {
  const d = await getDb()
  if (tag !== undefined) d.run(`UPDATE contents SET tag = ? WHERE id = ?`, [tag, id])
  if (data !== undefined) d.run(`UPDATE contents SET data = ? WHERE id = ?`, [JSON.stringify(data), id])
  persist()
}

function rowToRecord(row) {
  return {
    id: row[0],
    url: row[1],
    tag: row[2],
    status: row[3],
    data: JSON.parse(row[4]),
    createdAt: row[5],
  }
}

async function listByStatus(status) {
  const d = await getDb()
  const res = d.exec(`SELECT id, url, tag, status, data, created_at FROM contents WHERE status = ? ORDER BY id DESC`, [
    status,
  ])
  if (res.length === 0) return []
  return res[0].values.map(rowToRecord)
}

async function approve(id, folder) {
  const d = await getDb()
  const res = d.exec(`SELECT data FROM contents WHERE id = ?`, [id])
  if (res.length === 0) return
  const data = JSON.parse(res[0].values[0][0])
  data.folder = folder ?? null
  d.run(`UPDATE contents SET status = 'approved', data = ? WHERE id = ?`, [JSON.stringify(data), id])
  persist()
}

async function discard(id) {
  const d = await getDb()
  d.run(`DELETE FROM contents WHERE id = ?`, [id])
  persist()
}

// 앱 시작 시 활성 job 이 없으므로, processing 상태로 남은 행은 이전 세션이
// 중간에 끊긴 고아 행이다. 실패로 표시해 UI 에서 Discard 할 수 있게 한다.
async function resetStuckJobs() {
  const d = await getDb()
  const res = d.exec(`SELECT id, data FROM contents WHERE status = 'pending'`)
  if (res.length === 0) return
  let changed = false
  for (const [id, dataStr] of res[0].values) {
    const data = JSON.parse(dataStr)
    if (!data.processing) continue
    data.processing = false
    delete data.stage
    data.error = data.error ?? 'Interrupted — the app was restarted while processing.'
    d.run(`UPDATE contents SET data = ? WHERE id = ?`, [JSON.stringify(data), id])
    changed = true
  }
  if (changed) persist()
}

module.exports = { insertContent, updateContent, listByStatus, approve, discard, resetStuckJobs }
