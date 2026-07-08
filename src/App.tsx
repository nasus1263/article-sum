import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Pending from './pages/Pending'
import Archive from './pages/Archive'
import Summaries from './pages/Summaries'
import Settings from './pages/Settings'
import { useApiKeys } from './hooks/useApiKeys'
import { useModels } from './hooks/useModels'

type Page = 'home' | 'pending' | 'archive' | 'summaries' | 'settings'

const TABS: { id: Page; label: string }[] = [
  { id: 'home', label: 'Summarize' },
  { id: 'pending', label: 'Pending Approval' },
  { id: 'archive', label: 'Archive' },
  { id: 'summaries', label: 'Summary History' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const { keys } = useApiKeys()
  const { models } = useModels()

  // Electron 메인 프로세스는 클립보드 파이프라인에서 같은 API 키/모델을 쓴다.
  // 렌더러 localStorage 값이 바뀔 때마다 main으로 동기화.
  useEffect(() => {
    window.api?.syncSettings({ apiKeys: keys, models })
  }, [keys, models])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="w-full max-w-2xl mx-auto p-6 flex flex-col gap-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Article Summary</h1>
          <nav className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setPage(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  page === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {page === 'home' && <Home />}
        {page === 'pending' && <Pending />}
        {page === 'archive' && <Archive />}
        {page === 'summaries' && <Summaries />}
        {page === 'settings' && <Settings />}
      </div>
    </div>
  )
}
