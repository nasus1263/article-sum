import { useEffect, useState } from 'react'
import type { SummaryRecord } from '../types'
import { LANGUAGES, PROVIDERS } from '../types'
import { deleteSummary, listSummaries } from '../services/db'

const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'

export default function Summaries() {
  const [records, setRecords] = useState<SummaryRecord[] | null>(null)

  useEffect(() => {
    listSummaries().then(setRecords)
  }, [])

  async function handleDelete(id: number) {
    await deleteSummary(id)
    setRecords((prev) => prev?.filter((r) => r.id !== id) ?? null)
  }

  if (records === null) {
    return <p className="text-slate-500 text-sm">Loading...</p>
  }

  if (records.length === 0) {
    return <p className="text-slate-500 text-sm">No saved summaries.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {records.map((r) => (
        <section key={r.id} className={cardClass}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block bg-indigo-600 text-xs px-2 py-1 rounded-full font-medium">
              {r.category}
            </span>
            <span className="text-xs text-slate-500">{PROVIDERS.find((p) => p.id === r.provider)?.label}</span>
            <span className="text-xs text-slate-500">{LANGUAGES.find((l) => l.id === r.language)?.label}</span>
            <span className="text-xs text-slate-600 ml-auto">{new Date(r.createdAt).toLocaleString('en-US')}</span>
          </div>
          <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">{r.summary}</p>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer">View original</summary>
            <p className="whitespace-pre-wrap mt-2 text-slate-400">{r.article}</p>
          </details>
          <button
            onClick={() => handleDelete(r.id)}
            className="self-end text-xs text-red-400 hover:text-red-300"
          >
            Delete
          </button>
        </section>
      ))}
    </div>
  )
}
