import { SOURCE, type ExtensionMessage, type RuntimeEvent } from '../utils/shared'
import { mergeApiResult } from '@pageflow/core/api'
import { boundedPageFlowDocumentHeight, detectPageFlowPreviewSize } from '@pageflow/runtime'
import { collectApiFields } from '../../../src/runtime/api-fields'
import type { PageFlowApiResult } from '@pageflow/core/types'
import { pageFlowRuntimeStorageKey } from '@pageflow/core/storage'

interface PersistedRuntimeState {
  pages: Array<(RuntimeEvent & { kind: 'page' })['page']>
  edges: Array<Extract<RuntimeEvent, { kind: 'navigation' }>['edge']>
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  main() {
    const pages = new Map<string, RuntimeEvent & { kind: 'page' }>()
    const edges = new Map<string, Extract<RuntimeEvent, { kind: 'navigation' }>['edge']>()
    let requests: PageFlowApiResult[] = []
    let diagnostics: Extract<RuntimeEvent, { kind: 'diagnostics' }>['diagnostics'] = []
    const storageKey = pageFlowRuntimeStorageKey(location.origin)
    const initialized = browser.storage.local.get(storageKey).then((stored) => {
      const persisted = stored[storageKey] as PersistedRuntimeState | undefined
      persisted?.pages.forEach((page) => {
        const key = page.routeKey ?? page.url
        if (!pages.has(key)) pages.set(key, { kind: 'page', page })
      })
      persisted?.edges.forEach(edge => {
        if (!edges.has(edge.id)) edges.set(edge.id, edge)
      })
    })
    let persistTimer: ReturnType<typeof setTimeout> | undefined
    const persistRuntimeState = () => {
      clearTimeout(persistTimer)
      persistTimer = setTimeout(() => {
        void initialized.then(() => browser.storage.local.set({
          [storageKey]: {
            pages: [...pages.values()].map(item => item.page),
            edges: [...edges.values()],
          } satisfies PersistedRuntimeState,
        }))
      }, 100)
    }

    window.addEventListener('message', (message) => {
      if (message.source !== window || message.data?.source !== SOURCE || !message.data.event) return
      const event = message.data.event as RuntimeEvent
      if (event.kind === 'page') {
        const key = event.page.routeKey ?? event.page.url
        const existing = pages.get(key)
        if (!event.page.discovered || !existing || existing.page.discovered) pages.set(key, event as RuntimeEvent & { kind: 'page' })
        persistRuntimeState()
      }
      if (event.kind === 'page-remove') {
        pages.delete(event.url)
        edges.forEach((edge, id) => {
          if (edge.from === event.url || edge.to === event.url) edges.delete(id)
        })
        persistRuntimeState()
      }
      if (event.kind === 'navigation') {
        const previous = edges.get(event.edge.id)
        event.edge.occurrences = event.edge.occurrences
          ? (previous?.occurrences ?? 0) + event.edge.occurrences
          : previous?.occurrences ?? 1
        edges.set(event.edge.id, event.edge)
        persistRuntimeState()
      }
      if (event.kind === 'request') {
        const request = event.request as PageFlowApiResult
        if (request.body !== undefined) {
          void collectApiFields(request.body, document.body.innerText).then((fields) => {
            requests = mergeApiResult(requests, { ...request, fields })
            void browser.runtime.sendMessage({ type: 'pageflow:runtime', event: { kind: 'request', request: requests.at(-1)! } } satisfies ExtensionMessage)
          })
          return
        }
        requests = mergeApiResult(requests, { ...request, fields: request.fields ?? [] })
        event.request = requests.at(-1)!
      }
      if (event.kind === 'diagnostics') diagnostics = event.diagnostics
      void browser.runtime.sendMessage({ type: 'pageflow:runtime', event } satisfies ExtensionMessage)
    })

    browser.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === 'pageflow:get-state') {
        void initialized.then(() => sendResponse({ currentUrl: location.href, pages: [...pages.values()].map(item => item.page), edges: [...edges.values()], requests, diagnostics }))
        return true
      }
      if (message.type === 'pageflow:get-config-url') {
        const href = document.querySelector<HTMLLinkElement>('link[rel="pageflow-config"]')?.href
        sendResponse(href)
      }
      if (message.type === 'pageflow:get-metrics') {
        const previewSize = detectPageFlowPreviewSize(document, { width: window.innerWidth, height: window.innerHeight })
        sendResponse({
          pageWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          previewWidth: previewSize.width,
          previewHeight: previewSize.height,
        })
      }
      if (message.type === 'pageflow:get-capture-size') sendResponse({
        pageWidth: message.viewport.width,
        pageHeight: boundedPageFlowDocumentHeight(document, message.viewport.height),
      })
      if (message.type === 'pageflow:scan') window.postMessage({ source: SOURCE, command: 'scan' }, '*')
      if (message.type === 'pageflow:highlight') window.postMessage({ source: SOURCE, command: 'highlight', selector: message.selector }, '*')
      if (message.type === 'pageflow:network-request') {
        void collectApiFields(message.request.body, document.body.innerText).then((fields) => {
          requests = mergeApiResult(requests, { ...message.request, fields })
          void browser.runtime.sendMessage({ type: 'pageflow:runtime', event: { kind: 'request', request: requests.at(-1)! } } satisfies ExtensionMessage)
        })
      }
      if (message.type === 'pageflow:network-mode') window.postMessage({ source: SOURCE, command: 'network-mode', mode: message.mode }, '*')
    })
  },
})
