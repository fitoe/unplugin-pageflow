import { SOURCE, type RuntimeEvent } from '../utils/shared'
import { isBusinessApiResponse } from '@pageflow/core/api'
import { highlightPageFlowElement, instrumentPageFlowHistory, instrumentPageFlowNetwork, observePageFlowScroll, pageFlowHotspotBounds, pageFlowInternalLinks, pageFlowLinkLabel } from '@pageflow/runtime'
import { findVueRouterAdapter } from '../../../src/runtime/adapters/vue-router'
import type { PageFlowRouterAdapter } from '../../../src/runtime/adapters/types'

declare global {
  interface Window { __PAGEFLOW_CHROME_RUNTIME__?: boolean }
}

const MAX_DISCOVERED_PAGES = 200
const MAX_INSPECTED_JSON_SIZE = 1_000_000

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    if (window.__PAGEFLOW_CHROME_RUNTIME__) return
    window.__PAGEFLOW_CHROME_RUNTIME__ = true

    const emit = (event: RuntimeEvent) => window.postMessage({ source: SOURCE, event }, '*')
    const excludedPageUrls = new Set<string>()
    let router: PageFlowRouterAdapter | undefined
    const routeKeyFor = (value: string | URL) => {
      const url = new URL(value, location.href)
      url.hash = ''
      url.search = ''
      const resolvedRoute = router?.resolve(url)
      if (resolvedRoute?.path) {
        url.pathname = resolvedRoute.path.includes(':') ? url.pathname : resolvedRoute.path
        return url.href
      }
      return url.href
    }
    const reportRouterPages = async () => {
      for (let attempt = 0; attempt < 50 && !router; attempt++) {
        router = findVueRouterAdapter()
        if (!router) await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (!router) return
      for (const route of router.routes()) {
        if (route.redirect || route.aliasOf || route.catchAll) {
          if (!route.path.includes(':')) {
            const url = new URL(route.path, location.origin).href
            excludedPageUrls.add(url)
            emit({ kind: 'page-remove', url })
          }
          continue
        }
        if (route.path.includes(':')) continue
        const url = new URL(route.path, location.origin)
        emit({ kind: 'page', page: {
          url: url.href,
          routeKey: new URL(route.path, location.origin).href,
          discovered: true,
          title: route.title || route.name || route.path,
          updatedAt: Date.now(),
        } })
      }
    }
    let currentUrl = location.href
    const reportedLinks = new Set<string>()
    const reportedLinkElements = new Map<string, Element>()
    const discoveredPages = new Set<string>()
    const reportLinkedPages = (positionsOnly = false) => {
      const sourceUrl = new URL(location.href)
      sourceUrl.hash = ''
      const candidates = pageFlowInternalLinks(document).map(({ element, target }) => ({ anchor: element, url: target }))
      for (const { anchor, url: targetUrl } of candidates) {
        if (targetUrl.href === sourceUrl.href) continue
        const sourceRouteKey = routeKeyFor(sourceUrl)
        const targetRouteKey = routeKeyFor(targetUrl)
        if (excludedPageUrls.has(targetRouteKey)) continue
        const edgeId = `${sourceRouteKey}->${targetRouteKey}`
        const reported = reportedLinks.has(edgeId)
        if (reported && !positionsOnly) continue
        if (reported && reportedLinkElements.get(edgeId) !== anchor) continue
        if (!reported) {
          if (discoveredPages.size >= MAX_DISCOVERED_PAGES) break
          reportedLinks.add(edgeId)
          reportedLinkElements.set(edgeId, anchor)
          discoveredPages.add(targetRouteKey)
          const title = pageFlowLinkLabel(anchor, targetUrl.pathname)
          emit({ kind: 'page', page: { url: targetUrl.href, routeKey: targetRouteKey, discovered: true, title, updatedAt: Date.now() } })
        }
        emit({ kind: 'navigation', edge: { id: edgeId, from: sourceRouteKey, to: targetRouteKey, occurrences: reported ? 0 : 1, hotspot: pageFlowHotspotBounds(anchor) } })
      }
    }
    const reportPage = () => {
      const nextUrl = location.href
      const nextRouteKey = routeKeyFor(nextUrl)
      emit({ kind: 'page', page: { url: nextUrl, routeKey: nextRouteKey, title: document.title, updatedAt: Date.now() } })
      if (currentUrl !== nextUrl) {
        const currentRouteKey = routeKeyFor(currentUrl)
        emit({ kind: 'navigation', edge: { id: `${currentRouteKey}->${nextRouteKey}`, from: currentRouteKey, to: nextRouteKey, occurrences: 1 } })
      }
      currentUrl = nextUrl
    }
    const observePageTitle = () => {
      let reportedTitle = document.title
      const observer = new MutationObserver(() => {
        if (document.title === reportedTitle) return
        reportedTitle = document.title
        reportPage()
      })
      observer.observe(document.head, { childList: true, characterData: true, subtree: true })
    }
    instrumentPageFlowHistory(window, () => queueMicrotask(reportPage))
    addEventListener('popstate', reportPage)
    addEventListener('hashchange', reportPage)
    addEventListener('DOMContentLoaded', () => {
      reportPage()
      observePageTitle()
      reportLinkedPages()
      void reportRouterPages()
    }, { once: true })
    observePageFlowScroll(document, () => reportLinkedPages(true))

    const reportRequest = (method: string, url: string, status: number, startedAt: number, contentType = '', body?: unknown) => {
      if (!isBusinessApiResponse(url, contentType)) return
      emit({ kind: 'request', request: { id: `${method}:${url}`, method, url, status, duration: Math.round(performance.now() - startedAt), occurredAt: Date.now(), contentType, body } })
    }
    let networkTracker: ReturnType<typeof instrumentPageFlowNetwork> | undefined
    const startInjectedNetwork = () => {
      if (networkTracker) return
      networkTracker = instrumentPageFlowNetwork(window, {
        onFetchResponse: (request, response) => {
          const contentType = response.headers.get('content-type') ?? ''
          if (!contentType.toLowerCase().includes('json') || Number(response.headers.get('content-length')) > MAX_INSPECTED_JSON_SIZE) {
            reportRequest(request.method, request.url, response.status, request.startedAt, contentType)
            return
          }
          void response.clone().text()
            .then(text => reportRequest(request.method, request.url, response.status, request.startedAt, contentType,
              text.length <= MAX_INSPECTED_JSON_SIZE ? JSON.parse(text) : undefined))
            .catch(() => reportRequest(request.method, request.url, response.status, request.startedAt, contentType))
        },
        onFetchError: request => reportRequest(request.method, request.url, 0, request.startedAt),
        onXhrComplete: (request, xhr) => {
          const contentType = xhr.getResponseHeader('content-type') ?? ''
          let body: unknown
          if (contentType.toLowerCase().includes('json')) {
            try {
              const text = xhr.responseType === '' || xhr.responseType === 'text' ? xhr.responseText : ''
              if (Number(xhr.getResponseHeader('content-length')) <= MAX_INSPECTED_JSON_SIZE && (!text || text.length <= MAX_INSPECTED_JSON_SIZE))
                body = xhr.responseType === 'json' ? xhr.response : JSON.parse(text)
            } catch {}
          }
          reportRequest(request.method, xhr.responseURL || request.url, xhr.status, request.startedAt, contentType, body)
        },
      })
    }
    startInjectedNetwork()

    addEventListener('message', (message) => {
      if (message.source !== window || message.data?.source !== SOURCE) return
      if (message.data?.command === 'network-mode') {
        if (message.data.mode === 'cdp') {
          networkTracker?.dispose()
          networkTracker = undefined
        } else startInjectedNetwork()
        return
      }
      if (message.data?.command === 'highlight' && typeof message.data.selector === 'string') {
        highlightPageFlowElement(window, message.data.selector)
        return
      }
      if (message.data?.command !== 'scan') return
      reportLinkedPages(true)
      void import('../../../src/runtime/diagnostics')
        .then(({ scanPageDiagnostics }) => scanPageDiagnostics())
        .then(diagnostics => emit({ kind: 'diagnostics', diagnostics }))
    })
  },
})
