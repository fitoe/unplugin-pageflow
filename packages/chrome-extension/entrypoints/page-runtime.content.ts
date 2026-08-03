import { SOURCE, type Diagnostic, type RuntimeEvent } from '../utils/shared'
import { isBusinessApiResponse } from '@pageflow/core/api'
import { highlightPageFlowElement, instrumentPageFlowHistory, instrumentPageFlowNetwork, pageFlowAccessibleName, pageFlowElementSelector } from '@pageflow/runtime'

declare global {
  interface Window { __PAGEFLOW_CHROME_RUNTIME__?: boolean }
}

const MAX_INSPECTED_JSON_SIZE = 1_000_000

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    if (window.__PAGEFLOW_CHROME_RUNTIME__) return
    window.__PAGEFLOW_CHROME_RUNTIME__ = true

    const emit = (event: RuntimeEvent) => window.postMessage({ source: SOURCE, event }, '*')
    let currentUrl = location.href
    const reportPage = () => {
      const nextUrl = location.href
      emit({ kind: 'page', page: { url: nextUrl, title: document.title, updatedAt: Date.now() } })
      if (currentUrl !== nextUrl) emit({ kind: 'navigation', edge: { id: `${currentUrl}->${nextUrl}`, from: currentUrl, to: nextUrl, occurrences: 1 } })
      currentUrl = nextUrl
    }
    instrumentPageFlowHistory(window, () => queueMicrotask(reportPage))
    addEventListener('popstate', reportPage)
    addEventListener('hashchange', reportPage)
    addEventListener('DOMContentLoaded', reportPage, { once: true })

    const reportRequest = (method: string, url: string, status: number, startedAt: number, contentType = '', body?: unknown) => {
      if (!isBusinessApiResponse(url, contentType)) return
      emit({
        kind: 'request',
        request: { id: `${method}:${url}`, method, url, status, duration: Math.round(performance.now() - startedAt), occurredAt: Date.now(), contentType, body },
      })
    }
    instrumentPageFlowNetwork(window, {
      onFetchResponse: (request, response) => {
        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.toLowerCase().includes('json')) {
          reportRequest(request.method, request.url, response.status, request.startedAt, contentType)
          return
        }
        const declaredSize = Number(response.headers.get('content-length'))
        if (declaredSize > MAX_INSPECTED_JSON_SIZE) {
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
            const declaredSize = Number(xhr.getResponseHeader('content-length'))
            const text = xhr.responseType === '' || xhr.responseType === 'text' ? xhr.responseText : ''
            if (declaredSize <= MAX_INSPECTED_JSON_SIZE && (!text || text.length <= MAX_INSPECTED_JSON_SIZE))
              body = xhr.responseType === 'json' ? xhr.response : JSON.parse(text)
          } catch {}
        }
        reportRequest(request.method, xhr.responseURL || request.url, xhr.status, request.startedAt, contentType, body)
      },
    })

    addEventListener('message', (message) => {
      if (message.source !== window || message.data?.source !== SOURCE) return
      if (message.data?.command === 'highlight' && typeof message.data.selector === 'string') {
        highlightPageFlowElement(window, message.data.selector)
        return
      }
      if (message.data?.command !== 'scan') return
      const diagnostics: Diagnostic[] = []
      document.querySelectorAll<HTMLImageElement>('img:not([alt])').forEach((element, index) => diagnostics.push({
        id: `missing-alt:${index}`, ruleId: 'missing-alt', severity: 'suggestion', category: 'accessibility', title: '图片缺少 alt', description: '为图片提供替代文本；装饰图片使用空 alt。', selector: pageFlowElementSelector(element),
      }))
      document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea').forEach((element, index) => {
        if (!pageFlowAccessibleName(element)) diagnostics.push({ id: `missing-name:${index}`, ruleId: 'missing-accessible-name', severity: 'error', category: 'accessibility', title: '交互元素缺少名称', description: '添加可见文字、aria-label 或关联标签。', selector: pageFlowElementSelector(element) })
      })
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) diagnostics.push({
        id: 'horizontal-overflow', ruleId: 'horizontal-overflow', severity: 'warning', category: 'visual', title: '页面存在横向溢出', description: '检查超宽元素、固定宽度和负边距。',
      })
      emit({ kind: 'diagnostics', diagnostics })
    })
  },
})
