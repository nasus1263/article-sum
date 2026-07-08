import { useState } from 'react'
import { LANGUAGES, PROVIDERS } from '../types'
import type { Provider, SummaryOptions } from '../types'
import { useApiKeys } from '../hooks/useApiKeys'
import { useModels } from '../hooks/useModels'
import { usePipelineDefaults } from '../hooks/usePipelineDefaults'

const inputClass =
  'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'

export default function Settings() {
  const { keys, updateKey } = useApiKeys()
  const { models, updateModel } = useModels()
  const { defaults, updateCategories, updateDefaultProvider, updateDefaultOptions } = usePipelineDefaults()
  const [newCategory, setNewCategory] = useState('')

  function handleOptionsChange(o: SummaryOptions) {
    updateDefaultOptions(o)
  }

  function handleCategoryRename(index: number, value: string) {
    if (!defaults) return
    const next = [...defaults.categories]
    next[index] = value
    updateCategories(next)
  }

  function handleCategoryRemove(index: number) {
    if (!defaults) return
    updateCategories(defaults.categories.filter((_, i) => i !== index))
  }

  function handleCategoryAdd() {
    const trimmed = newCategory.trim()
    if (!defaults || !trimmed || defaults.categories.includes(trimmed)) return
    updateCategories([...defaults.categories, trimmed])
    setNewCategory('')
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-slate-200">Settings</h2>

      {defaults && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-200">Pipeline defaults</h2>
          <section className={`${cardClass} flex-row flex-wrap items-center gap-x-6 gap-y-3`}>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={defaults.defaultOptions.emoji}
                onChange={(e) => handleOptionsChange({ ...defaults.defaultOptions, emoji: e.target.checked })}
                className="accent-indigo-500"
              />
              Add emojis
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={defaults.defaultOptions.kidFriendly}
                onChange={(e) => handleOptionsChange({ ...defaults.defaultOptions, kidFriendly: e.target.checked })}
                className="accent-indigo-500"
              />
              Kid-friendly (simple words)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              Summary language
              <select
                value={defaults.defaultOptions.language}
                onChange={(e) =>
                  handleOptionsChange({ ...defaults.defaultOptions, language: e.target.value as SummaryOptions['language'] })
                }
                className={inputClass}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 ml-auto">
              Provider
              <select
                value={defaults.defaultProvider}
                onChange={(e) => updateDefaultProvider(e.target.value as Provider)}
                className={inputClass}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <h2 className="text-lg font-semibold text-slate-200">Categories</h2>
          <div className={cardClass}>
            {defaults.categories.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={c}
                  onChange={(e) => handleCategoryRename(i, e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <button
                  onClick={() => handleCategoryRemove(i)}
                  className="text-xs text-red-400 hover:text-red-300 px-2"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category"
                className={`${inputClass} flex-1`}
              />
              <button
                onClick={handleCategoryAdd}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-1.5 font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {PROVIDERS.map((p) => (
          <div key={p.id} className={cardClass}>
            <span className="text-sm font-medium text-slate-300">{p.label}</span>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-500">API Key</label>
              <input
                type="password"
                placeholder={`${p.label} API Key`}
                value={keys[p.id]}
                onChange={(e) => updateKey(p.id, e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-500">Model name</label>
              <input
                value={models[p.id]}
                onChange={(e) => updateModel(p.id, e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
