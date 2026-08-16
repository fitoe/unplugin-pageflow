import type { PageFlowPreviewMode } from './thumbnails'

export interface PageFlowWorkbenchLocation {
  pagePath?: string
  groupPath: string[]
  viewport?: PageFlowPreviewMode
  user?: string
  panel?: 'tree' | 'api' | 'tests' | 'diagnostics' | 'todos'
  view?: 'canvas' | 'table'
}

const previewModes = new Set<PageFlowPreviewMode>(['mobile', 'tablet', 'pc'])
const panels = new Set<PageFlowWorkbenchLocation['panel']>(['tree', 'api', 'tests', 'diagnostics', 'todos'])

export function parseWorkbenchHash(hash: string): PageFlowWorkbenchLocation {
  const value = hash.replace(/^#/, '') || '/'
  const [pathname, query = ''] = value.split('?', 2)
  const params = new URLSearchParams(query)
  const viewport = params.get('viewport') as PageFlowPreviewMode | null
  const panel = params.get('panel') as PageFlowWorkbenchLocation['panel'] | null
  const view = params.get('view') === 'table' ? 'table' : 'canvas'
  const pageMatch = pathname.match(/^\/page\/(.+)$/)
  const groupMatch = pathname.match(/^\/group\/(.+)$/)
  return {
    pagePath: pageMatch ? decodeURIComponent(pageMatch[1]) : undefined,
    groupPath: groupMatch ? decodeURIComponent(groupMatch[1]).split('/').filter(Boolean) : [],
    viewport: viewport && previewModes.has(viewport) ? viewport : undefined,
    user: params.get('user') || undefined,
    panel: panel && panels.has(panel) ? panel : undefined,
    view,
  }
}

export function buildWorkbenchHash(state: PageFlowWorkbenchLocation) {
  const pathname = state.pagePath
    ? `/page/${encodeURIComponent(state.pagePath)}`
    : state.groupPath.length
      ? `/group/${encodeURIComponent(state.groupPath.join('/'))}`
      : '/'
  const params = new URLSearchParams()
  if (state.viewport) params.set('viewport', state.viewport)
  if (state.user) params.set('user', state.user)
  if (state.panel) params.set('panel', state.panel)
  if (state.view === 'table') params.set('view', 'table')
  const query = params.toString()
  return `#${pathname}${query ? `?${query}` : ''}`
}
