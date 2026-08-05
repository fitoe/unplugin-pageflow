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
  priority: boolean
}

export function planNextCapture(options: CapturePlanOptions): CapturePlan {
  const pageIds = new Set(options.pages.map(page => page.id))
  const manualIds = [...options.manualIds].filter(id => pageIds.has(id))
  const automaticIds = new Set([...options.priorityIds].filter(id => pageIds.has(id)))
  let batchIds = new Set([...options.batchIds].filter(id => automaticIds.has(id) || manualIds.includes(id)))
  if (!batchIds.size) {
    batchIds = new Set(options.pages
      .filter(page => automaticIds.has(page.id) && !options.isCurrent(page) && !options.failedIds.has(page.id))
      .sort((left, right) => Number(options.priorityIds.has(right.id)) - Number(options.priorityIds.has(left.id))
        || (left.routeOrder ?? Number.POSITIVE_INFINITY) - (right.routeOrder ?? Number.POSITIVE_INFINITY))
      .map(page => page.id))
  }
  manualIds.forEach(id => batchIds.add(id))
  const orderedIds = [...batchIds].sort((left, right) => Number(options.priorityIds.has(right)) - Number(options.priorityIds.has(left)))
  batchIds = new Set(orderedIds)
  const pageId = manualIds.find(id => batchIds.has(id)) ?? batchIds.values().next().value
  return {
    batchIds,
    pageId,
    manual: pageId ? manualIds.includes(pageId) : false,
    priority: pageId ? options.priorityIds.has(pageId) : false,
  }
}
