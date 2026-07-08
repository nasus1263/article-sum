import { useEffect, useMemo, useState } from 'react'
import type { ContentRecord } from '../types/global'
import { cachedImageSrc } from '../utils/imageCache'

const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'
const inputClass =
  'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function Archive({
  onChatWithArticle,
  onOpenArticle,
}: {
  onChatWithArticle: (id: number) => void
  onOpenArticle: (record: ContentRecord) => void
}) {
  const [records, setRecords] = useState<ContentRecord[] | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set())
  const [fullTextRecord, setFullTextRecord] = useState<ContentRecord | null>(null)

  function refresh() {
    window.api?.listApproved().then(setRecords)
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F5') {
        e.preventDefault()
        refresh()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

            return (
              <section
                key={r.id}
                onClick={() => !r.data.processing && onOpenArticle(r)}
                className={`${cardClass} p-2 cursor-pointer hover:border-slate-600 hover:bg-slate-900/80 transition-colors ${
                  r.data.processing ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                  <div className="flex flex-row items-center gap-3">
                    {r.data.images?.[0] ? (
                      <div className="relative h-16 w-16 flex-shrink-0">
                        {r.data.images.length > 1 && (
                          <>
                            <div className="absolute inset-0 rotate-[-10deg] rounded-lg bg-slate-800 border border-slate-700 -z-20" />
                            <div className="absolute inset-0 rotate-[10deg] rounded-lg bg-slate-800 border border-slate-700 -z-10" />
                          </>
                        )}
                        <img
                          src={cachedImageSrc(r.data.images[0])}
                          alt=""
                          className="relative h-16 w-16 object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-slate-800 flex-shrink-0" />
                    )}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.data.processing ? (
                          <span className="inline-block text-xs px-2 py-1 rounded-full font-medium bg-slate-700 animate-pulse">
                            🔄 {r.data.stage ?? 'Processing...'}
                          </span>
                        ) : (
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                              r.tag === 'Article' ? 'bg-indigo-600' : 'bg-slate-700'
                            }`}
                          >
                            {r.tag}
                          </span>
                        )}
                        {r.data.category && (
                          <span className="inline-block bg-slate-800 text-xs px-2 py-1 rounded-full">{r.data.category}</span>
                        )}
                      </div>
                      {r.data.title && <p className="text-sm font-semibold text-slate-100 truncate">{r.data.title}</p>}
                      {summary && <p className="text-xs text-slate-400 whitespace-pre-wrap">{summary}</p>}
                    </div>
                    <span className="text-slate-600 text-xs flex-shrink-0">▸</span>
                  </div>
                  <div className="flex flex-row justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {r.data.original && (
                      <button
                        onClick={() => onChatWithArticle(r.id)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg px-2 py-1 font-medium whitespace-nowrap"
                      >
                        Chat with this article
                      </button>
                    )}
                    {r.data.original && (
                      <button
                        onClick={() => setFullTextRecord(r)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 rounded-lg px-2 py-1 font-medium whitespace-nowrap"
                      >
                        View full text
                      </button>
                    )}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-slate-800 hover:bg-slate-700 rounded-lg px-2 py-1 font-medium text-center whitespace-nowrap"
                    >
                      View on web
                    </a>
                  </div>
                </section>
              )
          })}
        </section>
      ))}

      {fullTextRecord && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setFullTextRecord(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 max-w-2xl w-full max-h-[80vh]"
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                {fullTextRecord.data.title && (
                  <span className="text-sm font-semibold text-slate-100 truncate">{fullTextRecord.data.title}</span>
                )}
                <span className="text-xs text-slate-500 break-all">{fullTextRecord.url}</span>
              </div>
              <button
                onClick={() => setFullTextRecord(null)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 flex-shrink-0"
              >
                Close
              </button>
            </div>
            <p className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed overflow-y-auto">
              {fullTextRecord.data.original}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
