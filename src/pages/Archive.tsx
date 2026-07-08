import { useEffect, useMemo, useState } from 'react'
import type { ContentRecord } from '../types/global'

const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'
const inputClass =
  'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function Archive() {
  const [records, setRecords] = useState<ContentRecord[] | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function refresh() {
    window.api?.listApproved().then(setRecords)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this item?')) return
    await window.api?.discard(id)
    refresh()
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleCategoryFilter(category: string) {
    setCategoryFilter((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const r of records ?? []) {
      if (r.data.category) set.add(r.data.category)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [records])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (records ?? []).filter((r) => {
      if (categoryFilter.size > 0 && !(r.data.category && categoryFilter.has(r.data.category))) return false
      if (!query) return true
      const summary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined
      return r.url.toLowerCase().includes(query) || (summary?.toLowerCase().includes(query) ?? false)
    })
  }, [records, search, categoryFilter])

  if (!window.api) {
    return <p className="text-slate-500 text-sm">This feature is only available in the Electron app.</p>
  }

  if (records === null) {
    return <p className="text-slate-500 text-sm">Loading...</p>
  }

  const groups = new Map<string, ContentRecord[]>()
  for (const r of filtered) {
    const folder = r.data.folder ?? 'No folder'
    if (!groups.has(folder)) groups.set(folder, [])
    groups.get(folder)!.push(r)
  }
  const folders = [...groups.keys()].sort((a, b) => (a === 'No folder' ? 1 : b === 'No folder' ? -1 : a.localeCompare(b)))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by URL or summary"
          className={inputClass}
        />
        {categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => toggleCategoryFilter(c)}
                className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                  categoryFilter.has(c) ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {records.length === 0 && <p className="text-slate-500 text-sm">No archived items.</p>}
      {records.length > 0 && filtered.length === 0 && (
        <p className="text-slate-500 text-sm">No items match your search/filter.</p>
      )}

      {folders.map((folder) => (
        <section key={folder} className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-400">{folder}</h3>
          {groups.get(folder)!.map((r) => {
            const summary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined
            const isExpanded = expanded.has(r.id)

            if (!isExpanded) {
              return (
                <section
                  key={r.id}
                  onClick={() => toggleExpanded(r.id)}
                  className={`${cardClass} h-[100px] flex-row items-center gap-3 p-2 cursor-pointer hover:border-slate-600 hover:bg-slate-900/80 transition-colors`}
                >
                  {r.data.thumbnail ? (
                    <img src={r.data.thumbnail} alt="" className="h-full w-[84px] object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="h-full w-[84px] rounded-lg bg-slate-800 flex-shrink-0" />
                  )}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                          r.tag === 'Article' ? 'bg-indigo-600' : 'bg-slate-700'
                        }`}
                      >
                        {r.tag}
                      </span>
                      {r.data.category && (
                        <span className="inline-block bg-slate-800 text-xs px-2 py-1 rounded-full">{r.data.category}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 truncate">{r.url}</span>
                    {summary && <p className="text-xs text-slate-400 truncate">{summary}</p>}
                  </div>
                  <span className="text-slate-600 text-xs flex-shrink-0">▸</span>
                </section>
              )
            }

            return (
              <section key={r.id} className={cardClass}>
                <div
                  onClick={() => toggleExpanded(r.id)}
                  className="flex items-center gap-2 flex-wrap cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <span className="text-slate-600 text-xs">▾</span>
                  <span
                    className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                      r.tag === 'Article' ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    {r.tag}
                  </span>
                  {r.data.category && (
                    <span className="inline-block bg-slate-800 text-xs px-2 py-1 rounded-full">{r.data.category}</span>
                  )}
                  <span className="text-xs text-slate-600 ml-auto">{new Date(r.createdAt).toLocaleString('en-US')}</span>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-indigo-400 break-all hover:underline"
                >
                  {r.url}
                </a>
                {r.data.thumbnail && (
                  <img src={r.data.thumbnail} alt="" className="max-h-[200px] w-auto object-contain rounded-lg" />
                )}
                {summary && <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">{summary}</p>}
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(r.id)
                    }}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5"
                  >
                    Delete
                  </button>
                </div>
              </section>
            )
          })}
        </section>
      ))}
    </div>
  )
}
