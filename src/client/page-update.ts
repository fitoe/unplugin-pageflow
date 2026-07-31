import type { PageFlowLink, PageFlowPage } from '../shared/types'
import { preserveScannedFocusedLinks } from './focus-cache'

interface PageUpdateOptions {
  pages: PageFlowPage[]
  nextPage: PageFlowPage
  focusedPageId?: string
  scannedPageId?: string
  focusedLinks: PageFlowLink[]
}

export interface PageUpdatePlan {
  pages: PageFlowPage[]
  focusedLinks: PageFlowLink[]
  pageChanged: boolean
  action?: 'layout' | 'render'
}

export function focusTargetSetKey(links: PageFlowLink[]) {
  return [...new Set(links.map(link => link.to))].sort().join('\n')
}

export function planPageUpdate(options: PageUpdateOptions): PageUpdatePlan | undefined {
  const index = options.pages.findIndex(page => page.id === options.nextPage.id)
  if (index < 0) return
  const currentPage = options.pages[index]
  const focused = options.nextPage.id === options.focusedPageId
  const nextFocusedLinks = focused
    ? preserveScannedFocusedLinks(options.nextPage.id, options.scannedPageId, options.focusedLinks, options.nextPage.links)
    : options.focusedLinks
  const focusedGeometryChanged = focused && JSON.stringify(options.focusedLinks) !== JSON.stringify(nextFocusedLinks)
  const focusTargetsChanged = focused && focusTargetSetKey(options.focusedLinks) !== focusTargetSetKey(nextFocusedLinks)
  const pageChanged = JSON.stringify(currentPage) !== JSON.stringify(options.nextPage)
  const linksChanged = JSON.stringify(currentPage.links) !== JSON.stringify(options.nextPage.links)
  const pages = pageChanged ? [...options.pages] : options.pages
  if (pageChanged) pages[index] = options.nextPage
  return {
    pages,
    focusedLinks: nextFocusedLinks,
    pageChanged,
    action: focusTargetsChanged ? 'layout' : (!pageChanged ? focusedGeometryChanged : linksChanged) ? 'render' : undefined,
  }
}
