import { useEffect, useState } from 'react'
import type { ContentRecord } from '../types/global'
import { usePipelineDefaults } from '../hooks/usePipelineDefaults'

const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'
const inputClass =
  'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function Pending() {
  const [records, setRecords] = useState<ContentRecord[] | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const { defaults, updateActiveFolder } = usePipelineDefaults()

  function refresh() {
    window.api?.listPending().then(setRecords)
  }

  useEffect(() => {
    refresh()
    return window.api?.onQueueUpdate(refresh)
  }, [])

  async function handleApprove(id: number) {
    await window.api?.approve(id)
    refresh()
  }

  async function handleDiscard(id: number) {
    if (!window.confirm('Discard this item?')) return
    await window.api?.discard(id)
    refresh()
  }

  async function handleCancel(id: number) {
    await window.api?.cancel(id)
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

  if (!window.api) {
    return <p className="text-slate-500 text-sm">This feature is only available in the Electron app.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {defaults && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Folder</label>
          <select
            value={defaults.activeFolder ?? ''}
            onChange={(e) => updateActiveFolder(e.target.value || null)}
            className={inputClass}
          >
            <option value="">No folder</option>
            {defaults.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {records === null && <p className="text-slate-500 text-sm">Loading...</p>}

      {records && records.length === 0 && (
        <p className="text-slate-500 text-sm">No items pending approval. Try copying a link.</p>
      )}

      {records?.map((r) => {
        const summary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined
        const isExpanded = expanded.has(r.id)
        return (
          <section key={r.id} className={cardClass}>
            <div className="flex items-center gap-2 flex-wrap">
              {r.data.processing ? (
                <span className="inline-block text-xs px-2 py-1 rounded-full font-medium bg-slate-700">
                  {r.data.stage ?? 'Processing...'}
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
              <span className="text-xs text-slate-600 ml-auto">{new Date(r.createdAt).toLocaleString('en-US')}</span>
            </div>
            <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 break-all hover:underline">
              {r.url}
            </a>
            {r.data.thumbnail && (
              <img src={r.data.thumbnail} alt="" className="max-h-[200px] w-auto object-contain rounded-lg" />
            )}
            {summary && <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">{summary}</p>}
            {r.data.error && (
              <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
                {r.data.error}
              </p>
            )}
            {isExpanded && r.data.original && (
              <p className="whitespace-pre-wrap text-slate-400 text-sm leading-relaxed">{r.data.original}</p>
            )}
            <div className="flex gap-2 justify-end">
              {r.data.original && (
                <button
                  onClick={() => toggleExpanded(r.id)}
                  className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5"
                >
                  {isExpanded ? 'Hide full article' : 'Show full article'}
                </button>
              )}
              {r.data.processing ? (
                <button
                  onClick={() => handleCancel(r.id)}
                  className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5"
                >
                  Cancel
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleDiscard(r.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-1.5 font-medium"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
