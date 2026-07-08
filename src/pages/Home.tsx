import { useEffect, useState } from 'react'
import type { Provider, SummaryOptions, SummaryResult } from '../types'
import { LANGUAGES, PROVIDERS } from '../types'
import { summarizeArticle } from '../services/llm'
import { saveSummary } from '../services/db'
import { useApiKeys } from '../hooks/useApiKeys'
import { useModels } from '../hooks/useModels'
import { usePipelineDefaults } from '../hooks/usePipelineDefaults'

const inputClass =
  'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'

export default function Home() {
  const { keys } = useApiKeys()
  const { models } = useModels()
  const { defaults, updateDefaultProvider, updateDefaultOptions } = usePipelineDefaults()
  const [article, setArticle] = useState('')
  const [options, setOptions] = useState<SummaryOptions>({ emoji: false, kidFriendly: false, language: 'ko' })
  const [provider, setProvider] = useState<Provider>('claude')
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (defaults) {
      setProvider(defaults.defaultProvider)
      setOptions(defaults.defaultOptions)
    }
  }, [defaults])

  function handleProviderChange(p: Provider) {
    setProvider(p)
    updateDefaultProvider(p)
  }

  function handleOptionsChange(o: SummaryOptions) {
    setOptions(o)
    updateDefaultOptions(o)
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await summarizeArticle(article, options, provider, models[provider], keys)
      setResult(res)
      await saveSummary({ article, category: res.category, summary: res.summary, language: options.language, provider })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={cardClass}>
        <label className="text-xs text-slate-500">Article content</label>
        <textarea
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          rows={10}
          className={`${inputClass} resize-y`}
          placeholder="Paste the article text"
        />
      </section>

      <section className={`${cardClass} flex-row flex-wrap items-center gap-x-6 gap-y-3`}>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={options.emoji}
            onChange={(e) => handleOptionsChange({ ...options, emoji: e.target.checked })}
            className="accent-indigo-500"
          />
          Add emojis
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={options.kidFriendly}
            onChange={(e) => handleOptionsChange({ ...options, kidFriendly: e.target.checked })}
            className="accent-indigo-500"
          />
          Kid-friendly (simple words)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300 ml-auto">
          Summary language
          <select
            value={options.language}
            onChange={(e) => handleOptionsChange({ ...options, language: e.target.value as SummaryOptions['language'] })}
            className={inputClass}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="flex gap-3 items-center">
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as Provider)}
          className={inputClass}
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSubmit}
          disabled={loading || !article.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 transition-colors rounded-lg px-5 py-2 text-sm font-medium flex-1"
        >
          {loading ? 'Summarizing...' : 'Summarize'}
        </button>
      </section>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
      )}

      {result && (
        <section className={cardClass}>
          <span className="inline-block w-fit bg-indigo-600 text-xs px-2 py-1 rounded-full font-medium">
            {result.category}
          </span>
          <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">{result.summary}</p>
        </section>
      )}
    </div>
  )
}
