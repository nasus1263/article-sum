import initSqlJs, { type Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { Category, Language, Provider, SummaryRecord } from '../types'

const IDB_NAME = 'article-sum'
const IDB_STORE = 'db'
const IDB_KEY = 'sqlite'

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function loadFromIdb(): Promise<Uint8Array | null> {
  const idb = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function saveToIdb(data: Uint8Array): Promise<void> {
  const idb = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(data, IDB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

let dbPromise: Promise<Database> | null = null

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => wasmUrl })
      const existing = await loadFromIdb()
      const db = existing ? new SQL.Database(existing) : new SQL.Database()
      db.run(`CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article TEXT NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        language TEXT NOT NULL,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`)
      return db
    })()
  }
  return dbPromise
}

async function persist(db: Database): Promise<void> {
  await saveToIdb(db.export())
}

export async function saveSummary(row: {
  article: string
  category: Category
  summary: string
  language: Language
  provider: Provider
}): Promise<void> {
  const db = await getDb()
  db.run(
    `INSERT INTO summaries (article, category, summary, language, provider, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [row.article, row.category, row.summary, row.language, row.provider, new Date().toISOString()]
  )
  await persist(db)
}

export async function listSummaries(): Promise<SummaryRecord[]> {
  const db = await getDb()
  const res = db.exec(`SELECT id, article, category, summary, language, provider, created_at FROM summaries ORDER BY id DESC`)
  if (res.length === 0) return []
  return res[0].values.map((row) => ({
    id: row[0] as number,
    article: row[1] as string,
    category: row[2] as Category,
    summary: row[3] as string,
    language: row[4] as Language,
    provider: row[5] as Provider,
    createdAt: row[6] as string,
  }))
}

export async function deleteSummary(id: number): Promise<void> {
  const db = await getDb()
  db.run(`DELETE FROM summaries WHERE id = ?`, [id])
  await persist(db)
}
