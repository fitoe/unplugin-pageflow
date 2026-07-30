import type { PageFlowGraph, PageFlowPage, PageFlowRouteMode, ResolvedPageFlowOptions } from '../shared/types'
import { PAGEFLOW_GRAPH_EVENT, PAGEFLOW_PAGE_EVENT, PAGEFLOW_PAGE_REPORTED_MESSAGE } from '../shared/protocol'
import { resolvePreviewUrl } from './preview'

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

export async function scanPageLinks(
  config: ResolvedPageFlowOptions,
  pages: PageFlowGraph['pages'],
  routeMode: PageFlowRouteMode = 'history',
  viewport = { width: 1280, height: 900 },
) {
  const frame = document.createElement('iframe')
  frame.title = 'unplugin-pageflow link discovery'
  frame.tabIndex = -1
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('data-unplugin-pageflow-link-discovery', '')
  Object.assign(frame.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  })
  document.body.append(frame)

  try {
    for (const page of pages) {
      await new Promise<void>(resolve => {
        let completed = false
        let timeout: ReturnType<typeof setTimeout> | undefined
        const finish = () => {
          if (completed) return
          completed = true
          clearTimeout(timeout)
          window.removeEventListener('message', handleMessage)
          resolve()
        }
        const handleMessage = (event: MessageEvent) => {
          if (event.origin === window.location.origin
            && event.data?.type === PAGEFLOW_PAGE_REPORTED_MESSAGE
            && event.data.path === page.path) finish()
        }
        window.addEventListener('message', handleMessage)
        frame.onload = () => {
          clearTimeout(timeout)
          timeout = setTimeout(finish, 2500)
        }
        frame.onerror = finish
        frame.src = resolvePreviewUrl(page.path, config, window.location.origin, routeMode)
        timeout = setTimeout(finish, 5000)
      })
    }
  } finally {
    frame.remove()
  }
}
