import { useState } from 'react'
import Pending from './pages/Pending'
import Archive from './pages/Archive'
import Settings from './pages/Settings'
import Chat from './pages/Chat'
import Login from './pages/Login'
import { useAuth } from './hooks/useAuth'

type Page = 'pending' | 'archive' | 'chat' | 'settings'

const TABS: { id: Page; label: string }[] = [
  { id: 'pending', label: 'Pending Approval' },
  { id: 'archive', label: 'Archive' },
  { id: 'chat', label: 'Chat' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [page, setPage] = useState<Page>('pending')
  const [chatTarget, setChatTarget] = useState<number | null>(null)
  const { user, loading, signOut } = useAuth()

  function handleChatWithArticle(contentId: number) {
    setChatTarget(contentId)
    setPage('chat')
  }


  if (loading) return null

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <header className="shrink-0 w-full max-w-2xl mx-auto p-6 pb-4 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Clip Brief</h1>
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
        {user && (
          <button onClick={signOut} className="text-xs text-slate-400 hover:text-slate-200">
            Sign out ({user.email})
          </button>
        )}
      </header>

      <div className={`flex-1 min-h-0 ${page === 'chat' ? '' : 'overflow-y-auto'}`}>
        {page !== 'settings' && !user ? (
          <Login />
        ) : page === 'chat' ? (
          <Chat initialContentId={chatTarget} />
        ) : (
          <div className="w-full max-w-2xl mx-auto p-6 pt-0 flex flex-col gap-6">
            {page === 'pending' && <Pending />}
            {page === 'archive' && <Archive onChatWithArticle={handleChatWithArticle} />}
            {page === 'settings' && <Settings />}
          </div>
        )}
      </div>
    </div>
  )
}
