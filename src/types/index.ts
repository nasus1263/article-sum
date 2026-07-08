export type Category = 'Politics' | 'Economy' | 'Society' | 'Culture' | 'Sports' | 'IT'

export const CATEGORIES: Category[] = ['Politics', 'Economy', 'Society', 'Culture', 'Sports', 'IT']

export type Provider = 'claude' | 'gemini' | 'openai' | 'nvidia'

export const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'claude', label: 'Claude' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'nvidia', label: 'NVIDIA NIM' },
]

export interface ApiKeys {
  claude: string
  gemini: string
  openai: string
  nvidia: string
}

export type Models = Record<Provider, string>

export type Language = 'ko' | 'en' | 'ja' | 'zh'

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'ko', label: 'Korean' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: 'Japanese' },
  { id: 'zh', label: 'Chinese' },
]

export interface SummaryOptions {
  emoji: boolean
  kidFriendly: boolean
  language: Language
}

export interface SummaryResult {
  category: Category
  summary: string
}

export interface SummaryRecord {
  id: number
  article: string
  category: Category
  summary: string
  language: Language
  provider: Provider
  createdAt: string
}
