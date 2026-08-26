import type { PageFlowFigmaLink, PageFlowPage } from '../shared/types'

export interface ParsedFigmaLink {
  browserUrl: string
  desktopUrl: string
  fileKey: string
  nodeId?: string
}

const FIGMA_REF_PATTERN = /^([A-Za-z0-9_-]{6,})#(\d+(?::|-)\d+)$/

export function figmaRef(fileKey: string, nodeId: string) {
  return `${fileKey}#${nodeId.replaceAll('-', ':')}`
}

export function figmaUrl(ref: string) {
  const match = ref.match(FIGMA_REF_PATTERN)
  if (!match) return
  return `https://www.figma.com/design/${match[1]}/_?node-id=${encodeURIComponent(match[2].replaceAll(':', '-'))}`
}

export function extractFigmaLink(text: string) {
  const normalized = text.replaceAll('\\&', '&')
  const compact = normalized.match(/[A-Za-z0-9_-]{6,}#\d+(?::|-)\d+/)
  if (compact && figmaUrl(compact[0])) return compact[0]
  const match = normalized.match(/https:\/\/(?:www\.)?figma\.com\/(?:design|file|board)\/[^\s<>"'\])}]+/i)
  if (!match) return
  const candidate = match[0].replace(/[\])},，。；;]+$/g, '')
  const parsed = parseFigmaLink(candidate)
  return parsed?.nodeId ? figmaRef(parsed.fileKey, parsed.nodeId) : undefined
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

export function normalizeFigmaPages(input: Record<string, string> | undefined, labels: Record<string, string> = {}): Record<string, PageFlowFigmaLink> {
  return Object.fromEntries(Object.entries(input ?? {}).flatMap(([path, value]) => {
    const url = figmaUrl(value)
    if (!url) return []
    return [[path, {
      ref: value,
      url,
      ...(labels[path]?.trim() ? { label: labels[path].trim() } : {}),
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
  open(parsed.desktopUrl, '_blank')
  return true
}
