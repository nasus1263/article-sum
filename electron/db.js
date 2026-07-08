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
  persist()
  const [{ values }] = d.exec('SELECT last_insert_rowid()')
  return values[0][0]
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

async function approve(id) {
  const d = await getDb()
  d.run(`UPDATE contents SET status = 'approved' WHERE id = ?`, [id])
  persist()
}

async function discard(id) {
  const d = await getDb()
  d.run(`DELETE FROM contents WHERE id = ?`, [id])
  persist()
}

module.exports = { insertContent, updateContent, listByStatus, approve, discard }
