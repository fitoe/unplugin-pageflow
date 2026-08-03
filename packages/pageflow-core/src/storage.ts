export const PAGEFLOW_TODOS_STORAGE_KEY = 'pageflow:todos'
export const LEGACY_UNPLUGIN_TODOS_STORAGE_KEY = 'unplugin-pageflow:page-todos'

export function pageFlowCanvasStorageKey(origin: string) {
  return `pageflow:canvas:${origin}`
}

export function legacyChromeCanvasStorageKey(origin: string) {
  return `canvas:${origin}`
}
