import { SOURCE, type ExtensionMessage, type RuntimeEvent } from '../utils/shared'
import { mergeApiResult } from '@pageflow/core/api'

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  main() {
    const pages = new Map<string, RuntimeEvent & { kind: 'page' }>()
    const edges = new Map<string, Extract<RuntimeEvent, { kind: 'navigation' }>['edge']>()
    let requests: Extract<RuntimeEvent, { kind: 'request' }>['request'][] = []
    let diagnostics: Extract<RuntimeEvent, { kind: 'diagnostics' }>['diagnostics'] = []

    window.addEventListener('message', (message) => {
      if (message.source !== window || message.data?.source !== SOURCE || !message.data.event) return
      const event = message.data.event as RuntimeEvent
      if (event.kind === 'page') {
        const key = event.page.routeKey ?? event.page.url
        const existing = pages.get(key)
        if (!event.page.discovered || !existing || existing.page.discovered) pages.set(key, event as RuntimeEvent & { kind: 'page' })
      }
      if (event.kind === 'navigation') {
        const previous = edges.get(event.edge.id)
        event.edge.occurrences = event.edge.occurrences
          ? (previous?.occurrences ?? 0) + event.edge.occurrences
          : previous?.occurrences ?? 1
        edges.set(event.edge.id, event.edge)
      }
      if (event.kind === 'request') {
        requests = mergeApiResult(requests, event.request)
        event.request = requests.at(-1)!
      }
      if (event.kind === 'diagnostics') diagnostics = event.diagnostics
      void browser.runtime.sendMessage({ type: 'pageflow:runtime', event } satisfies ExtensionMessage)
    })

    browser.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === 'pageflow:get-state') sendResponse({ currentUrl: location.href, pages: [...pages.values()].map(item => item.page), edges: [...edges.values()], requests, diagnostics })
      if (message.type === 'pageflow:scan') window.postMessage({ source: SOURCE, command: 'scan' }, '*')
      if (message.type === 'pageflow:highlight') window.postMessage({ source: SOURCE, command: 'highlight', selector: message.selector }, '*')
      if (message.type === 'pageflow:network-request') {
        requests = mergeApiResult(requests, message.request)
        void browser.runtime.sendMessage({ type: 'pageflow:runtime', event: { kind: 'request', request: requests.at(-1)! } } satisfies ExtensionMessage)
      }
      if (message.type === 'pageflow:network-mode') window.postMessage({ source: SOURCE, command: 'network-mode', mode: message.mode }, '*')
    })
  },
})
