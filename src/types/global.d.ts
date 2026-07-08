import type { ApiKeys, Models, Provider, SummaryOptions } from './index'

export interface PipelineSettings {
  apiKeys: ApiKeys
  models: Models
  defaultProvider: Provider
  defaultOptions: SummaryOptions
}

export interface ContentRecord {
  id: number
  url: string
  tag: 'Article' | 'Not Article'
  status: 'pending' | 'approved'
  data: {
    original?: string
    category?: string
    summaries?: Record<string, string>
    processing?: boolean
  }
  createdAt: string
}

export interface ElectronApi {
  getSettings: () => Promise<PipelineSettings>
  syncSettings: (partial: Partial<PipelineSettings>) => Promise<PipelineSettings>
  listPending: () => Promise<ContentRecord[]>
  listApproved: () => Promise<ContentRecord[]>
  approve: (id: number) => Promise<void>
  discard: (id: number) => Promise<void>
  cancel: (id: number) => Promise<void>
  onQueueUpdate: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api?: ElectronApi
  }
}
