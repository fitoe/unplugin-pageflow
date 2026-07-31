import type { PageFlowPage, PageFlowRouteMode } from '../shared/types'

interface GraphUpdateOptions {
  pages: PageFlowPage[]
  nextPages: PageFlowPage[]
  routeMode: PageFlowRouteMode
  nextRouteMode: PageFlowRouteMode
  livePreviewId?: string
  livePreviewCacheIds: string[]
  focusedPageId?: string
  activeId: string
}

export interface GraphUpdatePlan {
  layoutChanged: boolean
  routeModeChanged: boolean
  pageIds: Set<string>
  livePreviewId?: string
  livePreviewCacheIds: string[]
  focusedPageRemoved: boolean
  activeId: string
  status: string
}

export function planGraphUpdate(options: GraphUpdateOptions): GraphUpdatePlan {
  const routeModeChanged = options.routeMode !== options.nextRouteMode
  const pageIds = new Set(options.nextPages.map(page => page.id))
  return {
    layoutChanged: options.pages.length !== options.nextPages.length
      || options.pages.some((page, index) => page.id !== options.nextPages[index]?.id || page.path !== options.nextPages[index]?.path),
    routeModeChanged,
    pageIds,
    livePreviewId: !routeModeChanged && options.livePreviewId && pageIds.has(options.livePreviewId)
      ? options.livePreviewId
      : undefined,
    livePreviewCacheIds: routeModeChanged ? [] : options.livePreviewCacheIds.filter(id => pageIds.has(id)),
    focusedPageRemoved: !routeModeChanged && Boolean(options.focusedPageId && !pageIds.has(options.focusedPageId)),
    activeId: pageIds.has(options.activeId) ? options.activeId : options.nextPages[0]?.id ?? '',
    status: options.nextPages.length ? 'Routes synced' : 'Waiting for Vue Router…',
  }
}
