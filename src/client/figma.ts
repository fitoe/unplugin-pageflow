import type { PageFlowFigmaLink, PageFlowPage } from '../shared/types'

export interface ParsedFigmaLink {
  browserUrl: string
  desktopUrl: string
  fileKey: string
  nodeId?: string
}

export function parseFigmaLink(value: string): ParsedFigmaLink | undefined {
  let url: URL
  try { url = new URL(value) }
  catch { return }
  if (url.protocol !== 'https:' || !/(^|\.)figma\.com$/i.test(url.hostname)) return
  const match = url.pathname.match(/^\/(?:design|file|board)\/([^/]+)/)
  if (!match) return
  const fileKey = match[1]
  const nodeId = url.searchParams.get('node-id') ?? undefined
  const desktop = new URL(`figma://file/${fileKey}`)
  if (nodeId) desktop.searchParams.set('node-id', nodeId)
  return { browserUrl: url.href, desktopUrl: desktop.href, fileKey, nodeId }
}

export function normalizeFigmaPages(input: Record<string, string | PageFlowFigmaLink> | undefined): Record<string, PageFlowFigmaLink> {
  return Object.fromEntries(Object.entries(input ?? {}).flatMap(([path, value]) => {
    const link = typeof value === 'string' ? { url: value } : value
    if (!link || !parseFigmaLink(link.url)) return []
    return [[path, {
      url: link.url,
      ...(link.label?.trim() ? { label: link.label.trim() } : {}),
      openMode: link.openMode === 'browser' ? 'browser' : 'desktop',
    } satisfies PageFlowFigmaLink]]
  }))
}

function routePattern(pattern: string) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/:[^/]+/g, '[^/]+')
  return new RegExp(`^${escaped}$`)
}

export function figmaLinkForPage(page: Pick<PageFlowPage, 'id' | 'path'>, mappings: Record<string, PageFlowFigmaLink>) {
  let path = page.path.split(/[?#]/, 1)[0] || '/'
  try { path = new URL(page.path).pathname }
  catch {}
  const direct = mappings[page.path] ?? mappings[path] ?? mappings[page.id]
  if (direct) return direct
  return Object.entries(mappings).find(([pattern]) => routePattern(pattern).test(path))?.[1]
}

export function openFigmaLink(link: PageFlowFigmaLink, open: (url: string, target: string) => unknown = window.open.bind(window)) {
  const parsed = parseFigmaLink(link.url)
  if (!parsed) return false
  open(link.openMode === 'browser' ? parsed.browserUrl : parsed.desktopUrl, '_blank')
  return true
}
