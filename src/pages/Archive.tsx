import { useEffect, useState } from 'react'
import type { ContentRecord } from '../types/global'

const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'

export default function Archive() {
  const [records, setRecords] = useState<ContentRecord[] | null>(null)

  function refresh() {
    window.api?.listApproved().then(setRecords)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleDelete(id: number) {
    await window.api?.discard(id)
    refresh()
  }

  if (!window.api) {
    return <p className="text-slate-500 text-sm">This feature is only available in the Electron app.</p>
  }

  if (records === null) {
    return <p className="text-slate-500 text-sm">Loading...</p>
  }

  if (records.length === 0) {
    return <p className="text-slate-500 text-sm">No archived items.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {records.map((r) => {
        const summary = r.data.summaries ? Object.values(r.data.summaries)[0] : undefined
        return (
          <section key={r.id} className={cardClass}>
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
              <span className="text-xs text-slate-600 ml-auto">{new Date(r.createdAt).toLocaleString('en-US')}</span>
            </div>
            <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 break-all hover:underline">
              {r.url}
            </a>
            {summary && <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">{summary}</p>}
            <div className="flex justify-end">
              <button
                onClick={() => handleDelete(r.id)}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5"
              >
                Delete
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
