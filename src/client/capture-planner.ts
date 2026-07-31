import type { PageFlowPage } from '../shared/types'

interface CapturePlanOptions {
  pages: PageFlowPage[]
  batchIds: Iterable<string>
  manualIds: Iterable<string>
  priorityIds: ReadonlySet<string>
  failedIds: ReadonlySet<string>
  isCurrent: (page: PageFlowPage) => boolean
}

export interface CapturePlan {
  batchIds: Set<string>
  pageId?: string
  manual: boolean
}

export function planNextCapture(options: CapturePlanOptions): CapturePlan {
  const pageIds = new Set(options.pages.map(page => page.id))
  let batchIds = new Set([...options.batchIds].filter(id => pageIds.has(id)))
  if (!batchIds.size) {
    batchIds = new Set(options.pages
      .filter(page => !options.isCurrent(page) && !options.failedIds.has(page.id))
      .sort((left, right) => Number(options.priorityIds.has(right.id)) - Number(options.priorityIds.has(left.id))
        || (left.routeOrder ?? Number.POSITIVE_INFINITY) - (right.routeOrder ?? Number.POSITIVE_INFINITY))
      .map(page => page.id))
  }
  const manualIds = [...options.manualIds]
  manualIds.forEach(id => batchIds.add(id))
  const pageId = manualIds.find(id => batchIds.has(id)) ?? batchIds.values().next().value
  return { batchIds, pageId, manual: pageId ? manualIds.includes(pageId) : false }
}
