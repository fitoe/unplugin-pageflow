import type { PageFlowGraph, PageFlowLighthouseReport, PageFlowLighthouseSession, PageFlowPage, PageFlowPageTest, PageFlowProjectConfig, ResolvedPageFlowOptions } from '../shared/types'
import type { PageFlowAIContext } from './ai-context'
import { PAGEFLOW_GRAPH_EVENT, PAGEFLOW_PAGE_EVENT, PAGEFLOW_TEST_EVENT } from '../shared/protocol'

export interface PageFlowEditorInfo {
  id: 'cursor' | 'jetbrains' | 'sublime' | 'system' | 'vscode' | 'zed'
  name: string
}

export async function fetchPageFlowGraph(config: ResolvedPageFlowOptions) {
  const response = await fetch(`${config.previewPath}api/graph`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Failed to load unplugin-pageflow graph: ${response.status}`)
  return response.json() as Promise<PageFlowGraph>
}

export async function refreshPageFlowConfig(config: ResolvedPageFlowOptions) {
  const response = await fetch(`${config.previewPath}api/config`, { method: 'POST' })
  if (!response.ok) throw new Error(await response.text() || `Failed to reload .pageflow: ${response.status}`)
  return response.json() as Promise<PageFlowProjectConfig>
}

export async function savePageFlowFigmaLink(config: ResolvedPageFlowOptions, path: string, text: string) {
  const response = await fetch(`${config.previewPath}api/figma-page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, text }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => undefined))?.error || 'Failed to save Figma link')
  return response.json() as Promise<{ path: string, link: ResolvedPageFlowOptions['figmaPages'][string] }>
}

export async function deletePageFlowFigmaLink(config: ResolvedPageFlowOptions, path: string) {
  const response = await fetch(`${config.previewPath}api/figma-page`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => undefined))?.error || 'Failed to delete Figma link')
  return response.json() as Promise<{ path: string }>
}

export interface PageFlowFigmaVersionResult {
  ref: string
  version?: string
  createdAt?: string
  error?: 'not-configured' | 'unauthorized' | 'unavailable'
}

export async function fetchPageFlowFigmaVersions(config: ResolvedPageFlowOptions) {
  const response = await fetch(`${config.previewPath}api/figma-version`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Failed to check Figma versions')
  return response.json() as Promise<{ versions: PageFlowFigmaVersionResult[] }>
}

export async function acknowledgePageFlowFigmaVersion(config: ResolvedPageFlowOptions, path: string, version: string) {
  const response = await fetch(`${config.previewPath}api/figma-version`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, version }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => undefined))?.error || 'Failed to acknowledge Figma version')
}

export async function initializePageFlowFigmaVersions(config: ResolvedPageFlowOptions, versions: Array<{ ref: string, version: string }>) {
  const response = await fetch(`${config.previewPath}api/figma-version`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versions }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => undefined))?.error || 'Failed to initialize Figma versions')
  return response.json() as Promise<{ initialized: Record<string, string> }>
}

export async function savePageFlowLocation(config: ResolvedPageFlowOptions, path: string, location: string) {
  const response = await fetch(`${config.previewPath}api/page-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, location }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => undefined))?.error || 'Failed to save page location')
}

export async function savePageFlowPageTreePlacement(config: ResolvedPageFlowOptions, path: string, group: string, order: number) {
  const response = await fetch(`${config.previewPath}api/page-tree-placement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, group, order }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => undefined))?.error || 'Failed to place page in tree')
}

export async function reportPageTitle(config: ResolvedPageFlowOptions, path: string, title: string) {
  const response = await fetch(`${config.previewPath}api/page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, title }),
  })
  if (!response.ok) throw new Error(`Failed to report page title: ${response.status}`)
}

export async function fetchPageFlowEditor(config: ResolvedPageFlowOptions) {
  const response = await fetch(`${config.previewPath}api/editor`)
  if (!response.ok) throw new Error(`Failed to detect the default editor: ${response.status}`)
  return response.json() as Promise<PageFlowEditorInfo>
}

export async function openPageFlowEditor(config: ResolvedPageFlowOptions, path: string) {
  const response = await fetch(`${config.previewPath}api/editor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  if (!response.ok) throw new Error(await response.text() || `Could not open the page source (${response.status})`)
}

export async function publishPageFlowAIContext(config: ResolvedPageFlowOptions, context: PageFlowAIContext) {
  const response = await fetch(`${config.previewPath}api/ai-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  })
  if (!response.ok) throw new Error(`Could not publish PageFlow AI context (${response.status})`)
}

export async function fetchPageFlowTests(config: ResolvedPageFlowOptions, path: string) {
  const response = await fetch(`${config.previewPath}api/tests?path=${encodeURIComponent(path)}`)
  if (!response.ok) throw new Error(`Failed to load page tests: ${response.status}`)
  return response.json() as Promise<PageFlowPageTest[]>
}

export async function runPageFlowLighthouse(config: ResolvedPageFlowOptions, path: string, session?: PageFlowLighthouseSession): Promise<PageFlowLighthouseReport> {
  const response = await fetch(`${config.previewPath}api/lighthouse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, session }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error || `Lighthouse audit failed (${response.status})`)
  }
  return response.json()
}

export async function runPageFlowTest(config: ResolvedPageFlowOptions, path: string, id: string) {
  const response = await fetch(`${config.previewPath}api/tests/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, id }),
  })
  if (!response.ok) throw new Error(await response.text() || `Page test failed: ${response.status}`)
  return response.json() as Promise<Pick<PageFlowPageTest, 'status' | 'duration' | 'output'>>
}

export async function cancelPageFlowTest(config: ResolvedPageFlowOptions, id: string) {
  const response = await fetch(`${config.previewPath}api/tests/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) throw new Error(await response.text() || `Could not cancel page test: ${response.status}`)
}

export function subscribeToPageFlowUpdates(
  config: ResolvedPageFlowOptions,
  callbacks: { graph: (graph: PageFlowGraph) => void; page: (page: PageFlowPage) => void; tests?: () => void; connected?: () => void },
) {
  const source = new EventSource(`${config.previewPath}api/events`)
  source.addEventListener('open', () => callbacks.connected?.())
  source.addEventListener(PAGEFLOW_GRAPH_EVENT, event => callbacks.graph(JSON.parse(event.data)))
  source.addEventListener(PAGEFLOW_PAGE_EVENT, event => callbacks.page(JSON.parse(event.data)))
  source.addEventListener(PAGEFLOW_TEST_EVENT, () => callbacks.tests?.())
  return () => source.close()
}

export function startRouteDiscovery(config: ResolvedPageFlowOptions) {
  const frame = document.createElement('iframe')
  frame.src = config.appUrl
  frame.title = 'unplugin-pageflow route discovery'
  frame.hidden = true
  frame.setAttribute('data-unplugin-pageflow-discovery', '')
  document.body.append(frame)
  return frame
}
