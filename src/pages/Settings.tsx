import { PROVIDERS } from '../types'
import { useApiKeys } from '../hooks/useApiKeys'
import { useModels } from '../hooks/useModels'

const inputClass =
  'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const cardClass = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-3'

export default function Settings() {
  const { keys, updateKey } = useApiKeys()
  const { models, updateModel } = useModels()

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-slate-200">Settings</h2>

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
