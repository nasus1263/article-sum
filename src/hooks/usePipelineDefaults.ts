import { useEffect, useState } from 'react'
import type { Provider, SummaryOptions } from '../types'

interface PipelineDefaults {
  defaultProvider: Provider
  defaultOptions: SummaryOptions
}

export function usePipelineDefaults() {
  const [defaults, setDefaults] = useState<PipelineDefaults | null>(null)

  useEffect(() => {
    window.api?.getSettings().then((s) => setDefaults({ defaultProvider: s.defaultProvider, defaultOptions: s.defaultOptions }))
  }, [])

  function updateDefaultProvider(defaultProvider: Provider) {
    setDefaults((prev) => (prev ? { ...prev, defaultProvider } : prev))
    window.api?.syncSettings({ defaultProvider })
  }

  function updateDefaultOptions(defaultOptions: SummaryOptions) {
    setDefaults((prev) => (prev ? { ...prev, defaultOptions } : prev))
    window.api?.syncSettings({ defaultOptions })
  }

  return { defaults, updateDefaultProvider, updateDefaultOptions }
}
