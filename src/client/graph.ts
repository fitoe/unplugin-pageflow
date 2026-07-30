import type { PageFlowGraph, ResolvedPageFlowOptions } from '../shared/types'
import { PAGEFLOW_GRAPH_EVENT } from '../shared/protocol'
import { resolvePreviewUrl } from './preview'

export async function fetchPageFlowGraph(config: ResolvedPageFlowOptions) {
  const response = await fetch(`${config.previewPath}api/graph`)
  if (!response.ok) throw new Error(`Failed to load unplugin-pageflow graph: ${response.status}`)
  return response.json() as Promise<PageFlowGraph>
}

export function subscribeToGraphUpdates(callback: (graph: PageFlowGraph) => void) {
  import.meta.hot?.on(PAGEFLOW_GRAPH_EVENT, callback)
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
    width: '1280px',
    height: '900px',
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
          setTimeout(resolve, 250)
        }
        frame.onload = finish
        frame.onerror = finish
        frame.src = resolvePreviewUrl(page.path, config)
        timeout = setTimeout(finish, 5000)
      })
    }
  } finally {
    frame.remove()
  }
}
