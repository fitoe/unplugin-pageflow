import type { ExtensionMessage } from '../utils/shared'
import { isBusinessApiResponse } from '@pageflow/core/api'
import type { PageFlowApiRequest } from '@pageflow/core/types'

const MAX_RESPONSE_BODY_SIZE = 1_000_000
const networkSessions = new Set<number>()
const pendingRequests = new Map<number, Map<string, {
  method: string
  url: string
  startedAt: number
  status?: number
  contentType?: string
}>>()

export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id == null || !/^https?:/.test(tab.url ?? '')) return
    const dashboardUrl = browser.runtime.getURL(`/panel.html?tabId=${tab.id}`)
    const existing = (await browser.tabs.query({ url: `${browser.runtime.getURL('/panel.html')}*` }))
      .find(candidate => candidate.url === dashboardUrl)
    if (existing?.id != null) {
      await browser.tabs.update(existing.id, { active: true })
      if (existing.windowId != null) await browser.windows.update(existing.windowId, { focused: true })
      return
    }
    await browser.tabs.create({ url: dashboardUrl, active: true, openerTabId: tab.id })
  })

  browser.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === 'pageflow:capture') void captureSourceTab(message.tabId, sender.tab?.id).then(sendResponse)
    else if (message.type === 'pageflow:capture-page') void captureBackgroundPage(message.tabId, message.url, message.viewport).then(
      value => sendResponse({ ok: true, value }),
      error => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
    )
    else if (message.type === 'pageflow:start-session') void startNetworkSession(message.tabId).then(
      () => sendResponse({ ok: true }),
      error => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
    )
    else if (message.type === 'pageflow:stop-session') void stopNetworkSession(message.tabId).then(() => sendResponse({ ok: true }))
    else return
    return true
  })

  browser.debugger.onEvent.addListener((source, method, params) => {
    if (source.tabId != null && networkSessions.has(source.tabId)) void handleNetworkEvent(source.tabId, method, params as Record<string, any>)
  })
  browser.debugger.onDetach.addListener((source) => {
    if (source.tabId == null) return
    const wasNetworkSession = networkSessions.delete(source.tabId)
    pendingRequests.delete(source.tabId)
    if (wasNetworkSession) void browser.tabs.sendMessage(source.tabId, { type: 'pageflow:network-mode', mode: 'injected' } satisfies ExtensionMessage).catch(() => undefined)
  })
  browser.tabs.onRemoved.addListener(tabId => {
    networkSessions.delete(tabId)
    pendingRequests.delete(tabId)
  })
})

async function startNetworkSession(tabId: number) {
  if (networkSessions.has(tabId)) return
  await browser.debugger.attach({ tabId }, '1.3')
  try {
    await browser.debugger.sendCommand({ tabId }, 'Network.enable', {
      maxTotalBufferSize: MAX_RESPONSE_BODY_SIZE * 4,
      maxResourceBufferSize: MAX_RESPONSE_BODY_SIZE * 2,
    })
    networkSessions.add(tabId)
    pendingRequests.set(tabId, new Map())
    await browser.tabs.sendMessage(tabId, { type: 'pageflow:network-mode', mode: 'cdp' } satisfies ExtensionMessage)
  } catch (error) {
    await browser.debugger.detach({ tabId }).catch(() => undefined)
    throw error
  }
}

async function stopNetworkSession(tabId: number) {
  await browser.tabs.sendMessage(tabId, { type: 'pageflow:network-mode', mode: 'injected' } satisfies ExtensionMessage).catch(() => undefined)
  networkSessions.delete(tabId)
  pendingRequests.delete(tabId)
  await browser.debugger.detach({ tabId }).catch(() => undefined)
}

async function handleNetworkEvent(tabId: number, method: string, params: Record<string, any>) {
  const requests = pendingRequests.get(tabId)
  if (!requests) return
  if (method === 'Network.requestWillBeSent') {
    if (params.type !== 'Fetch' && params.type !== 'XHR') return
    requests.set(params.requestId, {
      method: String(params.request?.method ?? 'GET').toUpperCase(),
      url: String(params.request?.url ?? ''),
      startedAt: Number(params.timestamp ?? 0),
    })
    return
  }
  const request = requests.get(params.requestId)
  if (!request) return
  if (method === 'Network.responseReceived') {
    request.status = Number(params.response?.status ?? 0)
    request.contentType = String(params.response?.mimeType ?? '')
    return
  }
  if (method !== 'Network.loadingFinished' && method !== 'Network.loadingFailed') return
  requests.delete(params.requestId)
  if (!isBusinessApiResponse(request.url, request.contentType)) return
  let body: unknown
  const responseSize = Number(params.encodedDataLength ?? 0)
  if (method === 'Network.loadingFinished' && request.contentType?.toLowerCase().includes('json') && responseSize <= MAX_RESPONSE_BODY_SIZE) {
    try {
      const result = await browser.debugger.sendCommand({ tabId }, 'Network.getResponseBody', { requestId: params.requestId }) as { body?: string; base64Encoded?: boolean }
      if (result.body != null) {
        const text = result.base64Encoded
          ? new TextDecoder().decode(Uint8Array.from(atob(result.body), character => character.charCodeAt(0)))
          : result.body
        if (text.length <= MAX_RESPONSE_BODY_SIZE) body = JSON.parse(text)
      }
    } catch {}
  }
  const result: PageFlowApiRequest = {
    id: `${request.method}:${request.url}`,
    method: request.method,
    url: request.url,
    status: method === 'Network.loadingFailed' ? 0 : request.status ?? 0,
    duration: Math.max(0, Math.round((Number(params.timestamp ?? request.startedAt) - request.startedAt) * 1_000)),
    occurredAt: Date.now(),
    responseSize,
    contentType: request.contentType,
    body,
  }
  await browser.tabs.sendMessage(tabId, { type: 'pageflow:network-request', request: result } satisfies ExtensionMessage).catch(() => undefined)
}

async function waitForTabComplete(tabId: number) {
  if ((await browser.tabs.get(tabId)).status === 'complete') return
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(onUpdated)
      reject(new Error('PageFlow page capture timed out'))
    }, 15_000)
    const onUpdated = (updatedTabId: number, change: { status?: string }) => {
      if (updatedTabId !== tabId || change.status !== 'complete') return
      clearTimeout(timeout)
      browser.tabs.onUpdated.removeListener(onUpdated)
      resolve()
    }
    browser.tabs.onUpdated.addListener(onUpdated)
  })
}

async function captureBackgroundPage(sourceTabId: number, url: string, viewport: { width: number; height: number }) {
  const sourceTab = await browser.tabs.get(sourceTabId)
  const captureTab = await browser.tabs.create({ url, active: false, windowId: sourceTab.windowId })
  if (captureTab.id == null) throw new Error('PageFlow capture tab is unavailable')
  const target = { tabId: captureTab.id }
  let attached = false
  try {
    await waitForTabComplete(captureTab.id)
    await browser.debugger.attach(target, '1.3')
    attached = true
    await browser.debugger.sendCommand(target, 'Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await new Promise(resolve => setTimeout(resolve, 500))
    const contentSize = await browser.tabs.sendMessage(captureTab.id, {
      type: 'pageflow:get-capture-size',
      viewport,
    } satisfies ExtensionMessage) as { pageWidth: number; pageHeight: number }
    const captureWidth = contentSize.pageWidth
    const captureHeight = Math.min(16_384, contentSize.pageHeight)
    const result = await browser.debugger.sendCommand(target, 'Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: captureWidth, height: captureHeight, scale: 1 },
    }) as { data?: string }
    if (!result.data) throw new Error('PageFlow did not receive screenshot data')
    return {
      source: `data:image/png;base64,${result.data}`,
      pageWidth: contentSize.pageWidth,
      pageHeight: contentSize.pageHeight,
    }
  } finally {
    if (attached) await browser.debugger.detach(target).catch(() => undefined)
    await browser.tabs.remove(captureTab.id).catch(() => undefined)
  }
}

async function captureSourceTab(sourceTabId: number, dashboardTabId?: number) {
  const source = await browser.tabs.get(sourceTabId)
  if (source.id == null) throw new Error('PageFlow source tab is unavailable')
  try {
    await browser.tabs.update(source.id, { active: true })
    await new Promise(resolve => setTimeout(resolve, 100))
    await browser.tabs.sendMessage(source.id, { type: 'pageflow:scan' } satisfies ExtensionMessage).catch(() => undefined)
    await new Promise(resolve => setTimeout(resolve, 50))
    const [sourceData, metrics] = await Promise.all([
      browser.tabs.captureVisibleTab(source.windowId, { format: 'png' }),
      browser.tabs.sendMessage(source.id, { type: 'pageflow:get-metrics' } satisfies ExtensionMessage) as Promise<{ pageWidth: number; pageHeight: number }>,
    ])
    return { source: sourceData, ...metrics }
  } finally {
    if (dashboardTabId != null) await browser.tabs.update(dashboardTabId, { active: true }).catch(() => undefined)
  }
}
