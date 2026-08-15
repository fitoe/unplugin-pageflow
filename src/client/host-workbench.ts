import type { PageFlowHostState } from '@pageflow/core/host'
import type { PageFlowApiResult } from '@pageflow/core/types'
import type { PageFlowLink, PageFlowPage } from '../shared/types'

export interface PageFlowHostGraph {
  pages: PageFlowPage[]
  pageUrls: Map<string, string>
  navigationLocations: Record<string, string>
  currentPageId?: string
  requests: PageFlowApiResult[]
}

export function hostStateToGraph(state: PageFlowHostState, accents: readonly string[]): PageFlowHostGraph {
  const pageUrls = new Map(state.pages.map(page => [page.routeKey ?? page.url, page.url]))
  const pagesByUrl = new Map(state.pages.map(page => [page.routeKey ?? page.url, page]))
  const linksByUrl = new Map<string, PageFlowLink[]>()
  state.edges.forEach((edge) => {
    if (!edge.hotspot) return
    const links = linksByUrl.get(edge.from) ?? []
    const target = pagesByUrl.get(edge.to)
    links.push({ label: target?.title || new URL(edge.to).pathname, to: new URL(edge.to).pathname, hotspot: edge.hotspot })
    linksByUrl.set(edge.from, links)
  })
  const pages = state.pages.map((page, index): PageFlowPage => ({
    id: page.routeKey ?? page.url,
    title: page.title,
    path: new URL(page.url).pathname,
    revision: String(page.updatedAt),
    accent: accents[index % accents.length] ?? '#3b82f6',
    links: linksByUrl.get(page.routeKey ?? page.url) ?? [],
    diagnostics: page.url === state.currentUrl ? state.diagnostics : [],
  }))
  const currentSnapshot = state.pages.find(page => page.url === state.currentUrl)
  return {
    pages,
    pageUrls,
    navigationLocations: Object.fromEntries(state.pages.map(page => {
      const location = new URL(page.url)
      return [new URL(page.routeKey ?? page.url).pathname, `${location.pathname}${location.search}`]
    })),
    currentPageId: currentSnapshot?.routeKey ?? currentSnapshot?.url ?? pages.at(-1)?.id,
    requests: state.requests.map(request => ({ ...request, fields: request.fields ?? [] })),
  }
}

export interface HostHotspotRect {
  id: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
}

export function hostHotspotRects(
  links: PageFlowLink[],
  source: { x: number, y: number, width: number, height: number, scale: number },
): HostHotspotRect[] {
  const hotspots = new Map(links.flatMap(link => link.hotspot
    ? [[`${link.kind ?? 'link'}:${link.hotspot.centerX}:${link.hotspot.centerY}`, { ...link.hotspot, kind: link.kind ?? 'link' }] as const]
    : []))
  return [...hotspots].map(([id, hotspot]) => {
    const event = hotspot.kind === 'event'
    const width = Math.max(1, (hotspot.width ?? 0) * source.width * source.scale)
    const height = Math.max(1, (hotspot.height ?? 0) * source.height * source.scale)
    return {
      id,
      x: source.x + hotspot.centerX * source.width * source.scale - width / 2,
      y: source.y + hotspot.centerY * source.height * source.scale - height / 2,
      width,
      height,
      fill: event ? 'rgba(101, 191, 255, 0.2)' : 'rgba(255, 92, 168, 0.2)',
      stroke: event ? '#65bfff' : '#ff5ca8',
    }
  })
}
