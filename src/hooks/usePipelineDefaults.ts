import { useEffect, useState } from 'react'
import type { SummaryOptions } from '../types'

interface PipelineDefaults {
  backendUrl: string
  defaultOptions: SummaryOptions
  folders: string[]
  activeFolder: string | null
}

export function usePipelineDefaults() {
  const [defaults, setDefaults] = useState<PipelineDefaults | null>(null)

  function refresh() {
    window.api?.getSettings().then((s) =>
      setDefaults({
        backendUrl: s.backendUrl,
        defaultOptions: s.defaultOptions,
        folders: s.folders,
        activeFolder: s.activeFolder,
      })
    )
  }

  useEffect(() => {
    refresh()
  }, [])

  function updateBackendUrl(backendUrl: string) {
    setDefaults((prev) => (prev ? { ...prev, backendUrl } : prev))
    window.api?.syncSettings({ backendUrl })
  }

  function updateDefaultOptions(defaultOptions: SummaryOptions) {
    setDefaults((prev) => (prev ? { ...prev, defaultOptions } : prev))
    window.api?.syncSettings({ defaultOptions })
  }

  function updateFolders(folders: string[]) {
    setDefaults((prev) => (prev ? { ...prev, folders } : prev))
    window.api?.syncSettings({ folders })
  }

  function updateActiveFolder(activeFolder: string | null) {
    setDefaults((prev) => (prev ? { ...prev, activeFolder } : prev))
    window.api?.syncSettings({ activeFolder })
  }

  return { defaults, refresh, updateBackendUrl, updateDefaultOptions, updateFolders, updateActiveFolder }
}

