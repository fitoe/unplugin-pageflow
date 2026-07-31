import type { PageFlowGraph, PageFlowPage, ResolvedPageFlowOptions } from '../shared/types'
import { PAGEFLOW_GRAPH_EVENT, PAGEFLOW_PAGE_EVENT } from '../shared/protocol'

export async function fetchPageFlowGraph(config: ResolvedPageFlowOptions) {
  const response = await fetch(`${config.previewPath}api/graph`)
  if (!response.ok) throw new Error(`Failed to load unplugin-pageflow graph: ${response.status}`)
  return response.json() as Promise<PageFlowGraph>
}

export async function reportPageTitle(config: ResolvedPageFlowOptions, path: string, title: string) {
  const response = await fetch(`${config.previewPath}api/page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, title }),
  })
  if (!response.ok) throw new Error(`Failed to report page title: ${response.status}`)
}

export function subscribeToPageFlowUpdates(
  config: ResolvedPageFlowOptions,
  callbacks: { graph: (graph: PageFlowGraph) => void; page: (page: PageFlowPage) => void },
) {
  const source = new EventSource(`${config.previewPath}api/events`)
  source.addEventListener(PAGEFLOW_GRAPH_EVENT, event => callbacks.graph(JSON.parse(event.data)))
  source.addEventListener(PAGEFLOW_PAGE_EVENT, event => callbacks.page(JSON.parse(event.data)))
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
