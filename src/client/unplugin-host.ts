import type { PageFlowHost, PageFlowHostState } from '@pageflow/core/host'
import type { PageFlowApiRequest, PageFlowBrowserRuntimeEvent, PageFlowNavigationEdge, PageFlowPageSnapshot } from '@pageflow/core/types'
import type { PageFlowGraph, PageFlowPage, ResolvedPageFlowOptions } from '../shared/types'
import { PAGEFLOW_DIAGNOSTIC_HIGHLIGHT_MESSAGE, PAGEFLOW_DIAGNOSTICS_SCAN_MESSAGE } from '../shared/protocol'
import { fetchPageFlowGraph, subscribeToPageFlowUpdates } from './graph'
import { resolvePreviewUrl } from './preview'

export interface UnpluginPageFlowHostOptions {
  config: ResolvedPageFlowOptions
  getFrame: () => HTMLIFrameElement | undefined
  capture: () => Promise<string>
  getRequests?: () => PageFlowApiRequest[]
}

function pageUrl(page: Pick<PageFlowPage, 'path'>, graph: Pick<PageFlowGraph, 'routeMode'>, config: ResolvedPageFlowOptions, origin: string) {
  return new URL(resolvePreviewUrl(page.path, config, origin, graph.routeMode), origin).href
}

export function graphToHostState(graph: PageFlowGraph, config: ResolvedPageFlowOptions, requests: PageFlowApiRequest[] = [], origin = window.location.origin): PageFlowHostState {
  const now = Date.now()
  const pages = graph.pages.map(page => ({ url: pageUrl(page, graph, config, origin), title: page.title, updatedAt: now }))
  const byPath = new Map(graph.pages.map(page => [page.path, page]))
  const edges = graph.pages.flatMap((page) => page.links.flatMap((link): PageFlowNavigationEdge[] => {
    const targetPath = link.to.split(/[?#]/, 1)[0]
    const target = byPath.get(targetPath)
    if (!target) return []
    const from = pageUrl(page, graph, config, origin)
    const to = pageUrl(target, graph, config, origin)
    return [{ id: `${from}->${to}`, from, to, occurrences: 1 }]
  }))
  return {
    currentUrl: pages[0]?.url ?? new URL(config.appUrl, origin).href,
    pages,
    edges: [...new Map(edges.map(edge => [edge.id, edge])).values()],
    requests,
    diagnostics: [],
  }
}

export class UnpluginPageFlowHost implements PageFlowHost {
  readonly sourceId = 'unplugin'
  private graph?: PageFlowGraph
  private readonly listeners = new Set<(event: PageFlowBrowserRuntimeEvent) => void>()

  constructor(private readonly options: UnpluginPageFlowHostOptions) {}

  async loadState() {
    this.graph = await fetchPageFlowGraph(this.options.config)
    return graphToHostState(this.graph, this.options.config, this.options.getRequests?.())
  }

  async navigate(url: string) {
    const frame = this.options.getFrame()
    if (frame) frame.src = url
  }

  async scan() {
    this.options.getFrame()?.contentWindow?.postMessage({ type: PAGEFLOW_DIAGNOSTICS_SCAN_MESSAGE }, window.location.origin)
  }

  async highlight(selector: string) {
    this.options.getFrame()?.contentWindow?.postMessage({ type: PAGEFLOW_DIAGNOSTIC_HIGHLIGHT_MESSAGE, selector }, window.location.origin)
  }

  capture() {
    return this.options.capture()
  }

  async loadStorage<T>(key: string) {
    const value = localStorage.getItem(key)
    if (value == null) return undefined
    try { return JSON.parse(value) as T }
    catch { return undefined }
  }

  async saveStorage(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value))
  }

  async removeStorage(key: string) {
    localStorage.removeItem(key)
  }

  publish(event: PageFlowBrowserRuntimeEvent) {
    this.listeners.forEach(listener => listener(event))
  }

  subscribe(listener: (event: PageFlowBrowserRuntimeEvent) => void) {
    this.listeners.add(listener)
    const stopUpdates = subscribeToPageFlowUpdates(this.options.config, {
      graph: (graph) => {
        this.graph = graph
        const state = graphToHostState(graph, this.options.config, this.options.getRequests?.())
        state.pages.forEach(page => this.publish({ kind: 'page', page }))
        state.edges.forEach(edge => this.publish({ kind: 'navigation', edge }))
      },
      page: (page) => {
        if (!this.graph) return
        const snapshot: PageFlowPageSnapshot = {
          url: pageUrl(page, this.graph, this.options.config, window.location.origin),
          title: page.title,
          updatedAt: Date.now(),
        }
        this.publish({ kind: 'page', page: snapshot })
      },
    })
    return () => {
      this.listeners.delete(listener)
      stopUpdates()
    }
  }
}
