import type {
  PageFlowRuntimeLink,
  ResolvedPageFlowOptions,
} from '../shared/types'
import { PAGEFLOW_PREVIEW_PARAM } from './index'
import { startPageFlowDomStatePersistence } from './state'
import { PAGEFLOW_API_RESULT_MESSAGE, PAGEFLOW_DIAGNOSTIC_HIGHLIGHT_MESSAGE, PAGEFLOW_DIAGNOSTICS_RESULT_MESSAGE, PAGEFLOW_DIAGNOSTICS_SCAN_MESSAGE, PAGEFLOW_HOTSPOT_HOVER_MESSAGE, PAGEFLOW_NAVIGATE_MESSAGE, PAGEFLOW_NETWORK_EVENT, PAGEFLOW_PAGE_REPORTED_MESSAGE, PAGEFLOW_READY_EVENT, PAGEFLOW_SCAN_MESSAGE, PAGEFLOW_SCAN_RESULT_MESSAGE } from '../shared/protocol'
import { highlightDiagnosticElement, scanPageDiagnostics } from './diagnostics'
import type { PageFlowRouterAdapter } from './adapters/types'
import { findVueRouterAdapter } from './adapters/vue-router'
import { findBrowserHistoryAdapter } from './adapters/browser-history'
import { mountPageFlowLauncher } from './launcher'
import { isLocalBusinessApiResponse } from './api-filter'

const apiInspectionEnabled = new URLSearchParams(window.location.search).has('__unplugin_pageflow_inspect')
const MAXIMUM_API_FIELDS = 2_000
const MAXIMUM_API_ARRAY_ITEMS = 100

function renderedPageValues() {
  const values = [document.body?.innerText ?? '']
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')
    .forEach(element => values.push(element.value))
  document.querySelectorAll<HTMLElement>('[aria-label], [title], img[alt]')
    .forEach(element => values.push(element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? '', element.getAttribute('alt') ?? ''))
  return values.join('\n')
}

function apiFields(value: unknown, path = '', fields: Array<{ path: string, value: string | number | boolean | null, used: boolean }> = [], pageValues = renderedPageValues()) {
  if (fields.length >= MAXIMUM_API_FIELDS) return fields
  if (Array.isArray(value)) {
    value.slice(0, MAXIMUM_API_ARRAY_ITEMS).forEach((item, index) => apiFields(item, `${path}[${index}]`, fields, pageValues))
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => apiFields(item, path ? `${path}.${key}` : key, fields, pageValues))
  } else if (path) {
    const rendered = value == null ? String(value) : String(value)
    const fieldValue = typeof value === 'string' && value.length > 160
      ? `${value.slice(0, 157)}…`
      : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? value
        : value == null
          ? null
        : rendered
    fields.push({ path, value: fieldValue, used: rendered !== '' && pageValues.includes(rendered) })
  }
  return fields
}

function reportApiResult(method: string, url: string, status: number, duration: number, value: unknown, responseSize = 0, contentType = '') {
  if (!apiInspectionEnabled || window.parent === window || url.includes('/__unplugin-pageflow/') || !isLocalBusinessApiResponse(url, window.location.origin, contentType)) return
  window.parent.postMessage({
    type: PAGEFLOW_API_RESULT_MESSAGE,
    result: {
      id: `${method}:${url}`,
      method,
      url,
      status,
      duration: Math.round(duration),
      occurredAt: Date.now(),
      responseSize,
      contentType,
      fields: apiFields(value),
    },
  }, window.location.origin)
}

interface PageFlowWindow extends Window {
  __UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__?: () => number
  __UNPLUGIN_PAGEFLOW_SCAN_BOUND__?: boolean
  __UNPLUGIN_PAGEFLOW_SCROLL_SCAN_BOUND__?: boolean
  __UNPLUGIN_PAGEFLOW_WEBGL_CAPTURE_BOUND__?: boolean
}

function preservePreviewWebGLFrames() {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  const trackedWindow = window as PageFlowWindow
  if (trackedWindow.__UNPLUGIN_PAGEFLOW_WEBGL_CAPTURE_BOUND__) return
  trackedWindow.__UNPLUGIN_PAGEFLOW_WEBGL_CAPTURE_BOUND__ = true
  const prototype = window.HTMLCanvasElement.prototype
  const originalGetContext = prototype.getContext
  prototype.getContext = function (this: HTMLCanvasElement, contextId: string, options?: Record<string, unknown>) {
    const captureWebGL = contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl'
    return originalGetContext.call(this, contextId, captureWebGL
      ? { ...options, preserveDrawingBuffer: true }
      : options)
  } as typeof prototype.getContext
}

function trackPreviewRequests() {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  const trackedWindow = window as PageFlowWindow
  if (trackedWindow.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__) return

  let pending = 0
  const update = (change: number) => {
    pending = Math.max(0, pending + change)
    window.dispatchEvent(new window.Event(PAGEFLOW_NETWORK_EVENT))
  }
  trackedWindow.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__ = () => pending

  const originalFetch = window.fetch.bind(window)
  window.fetch = (...args) => {
    const startedAt = performance.now()
    const request = args[0]
    const method = (args[1]?.method ?? (request instanceof Request ? request.method : 'GET')).toUpperCase()
    const url = request instanceof Request ? request.url : String(request)
    update(1)
    return originalFetch(...args).then(response => {
      const contentType = response.headers?.get?.('content-type') ?? ''
      if (apiInspectionEnabled && isLocalBusinessApiResponse(url, window.location.origin, contentType) && typeof response.clone === 'function') {
        const clone = response.clone()
        const text = typeof clone.text === 'function' ? clone.text() : undefined
        if (text) void text.then((text) => {
          let value: unknown = text
          if (contentType.includes('json') || /^[\s]*[\[{]/.test(text)) {
            try { value = JSON.parse(text) } catch {}
          }
          const size = new TextEncoder().encode(text).byteLength
            requestAnimationFrame(() => reportApiResult(method, url, response.status, performance.now() - startedAt, value, size, contentType))
        }).catch(() => requestAnimationFrame(() => reportApiResult(method, url, response.status, performance.now() - startedAt, undefined, 0, contentType)))
        else if (typeof clone.json === 'function')
          void clone.json().then(value => requestAnimationFrame(() => reportApiResult(method, url, response.status, performance.now() - startedAt, value, 0, contentType)))
            .catch(() => undefined)
      }
      return response
    }, (error) => {
      if (apiInspectionEnabled)
        requestAnimationFrame(() => reportApiResult(method, url, 0, performance.now() - startedAt, undefined))
      throw error
    }).finally(() => update(-1))
  }

  const requests = new WeakMap<XMLHttpRequest, { method: string, url: string, startedAt: number }>()
  const originalOpen = window.XMLHttpRequest.prototype.open
  window.XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: unknown[]) {
    requests.set(this, { method: method.toUpperCase(), url: String(url), startedAt: 0 })
    return originalOpen.apply(this, [method, url, ...args] as Parameters<XMLHttpRequest['open']>)
  }
  const originalSend = window.XMLHttpRequest.prototype.send
  window.XMLHttpRequest.prototype.send = function (...args) {
    const request = requests.get(this)
    if (request) request.startedAt = performance.now()
    update(1)
    this.addEventListener('loadend', () => {
      update(-1)
      const current = requests.get(this)
      const contentType = this.getResponseHeader('content-type') ?? ''
      if (!apiInspectionEnabled || !current || !isLocalBusinessApiResponse(this.responseURL || current.url, window.location.origin, contentType)) return
      try {
        const text = this.responseType === '' || this.responseType === 'text' ? this.responseText : ''
        let value: unknown = this.responseType === 'json' && this.response != null ? this.response : text
        if (text && (contentType.includes('json') || /^[\s]*[\[{]/.test(text))) {
          try { value = JSON.parse(text) } catch {}
        }
        const size = text ? new TextEncoder().encode(text).byteLength
          : this.response instanceof Blob ? this.response.size
            : this.response instanceof ArrayBuffer ? this.response.byteLength : 0
        requestAnimationFrame(() => reportApiResult(current.method, this.responseURL || current.url, this.status, performance.now() - current.startedAt, value, size, contentType))
      } catch {}
    }, { once: true })
    return originalSend.apply(this, args)
  }
}

interface VueRenderedElement extends Element {
  __vueParentComponent?: {
    vnode?: { el?: Element; props?: Record<string, unknown> | null }
    subTree?: { el?: Element; props?: Record<string, unknown> | null }
    setupState?: Record<string, unknown>
    parent?: VueRenderedElement['__vueParentComponent']
  }
}

interface UniNavigationOptions {
  url?: string
  success?(result: { errMsg: string }): void
  complete?(result: { errMsg: string }): void
}

interface UniNavigationApi {
  navigateTo?(options: UniNavigationOptions): unknown
  redirectTo?(options: UniNavigationOptions): unknown
  switchTab?(options: UniNavigationOptions): unknown
  reLaunch?(options: UniNavigationOptions): unknown
}

function repairPreviewAssetUrls(config: ResolvedPageFlowOptions) {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  const appUrl = config.appUrl.endsWith('/') ? config.appUrl : `${config.appUrl}/`
  const base = new URL(appUrl, window.location.origin)
  const resolveRelative = (value: string) => /^\.\.?(?:\/|$)/.test(value) ? new URL(value, base).href : value
  const repair = (root: ParentNode) => {
    root.querySelectorAll<HTMLImageElement | HTMLSourceElement>('img[src], source[src]').forEach(element => {
      const value = element.getAttribute('src')
      const next = value && resolveRelative(value)
      if (next && next !== value) element.setAttribute('src', next)
    })
    root.querySelectorAll<HTMLImageElement | HTMLSourceElement>('img[srcset], source[srcset]').forEach(element => {
      const value = element.getAttribute('srcset')
      if (!value) return
      const next = value.split(',').map(candidate => {
        const [url, descriptor] = candidate.trim().split(/\s+/, 2)
        return [resolveRelative(url), descriptor].filter(Boolean).join(' ')
      }).join(', ')
      if (next !== value) element.setAttribute('srcset', next)
    })
    root.querySelectorAll<HTMLVideoElement>('video[poster]').forEach(element => {
      const value = element.getAttribute('poster')
      const next = value && resolveRelative(value)
      if (next && next !== value) element.setAttribute('poster', next)
    })
  }
  repair(document)
  const observer = new MutationObserver(records => records.forEach(record => {
    if (record.type === 'childList') record.addedNodes.forEach(node => {
      if (node instanceof Element) repair(node.matches('img, source, video') ? node.parentNode ?? document : node)
    })
    else if (record.target.parentNode) repair(record.target.parentNode)
  }))
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['poster', 'src', 'srcset'],
    childList: true,
    subtree: true,
  })
}

async function publishRoutes(router: PageFlowRouterAdapter, config: ResolvedPageFlowOptions) {
  await fetch(`${config.previewPath}api/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeMode: router.routeMode(), routes: router.routes() }),
  })
}

const programmaticLinks = new Map<string, PageFlowRuntimeLink>()
const programmaticElements = new Map<Element, Map<string, string>>()

function associateProgrammaticElement(element: Element, target: string, location = target) {
  const targets = programmaticElements.get(element) ?? new Map<string, string>()
  targets.set(target, location)
  programmaticElements.set(element, targets)
}
let lastClickedElement: Element | null = null

function notifyNavigation(to: string, location = to, interaction?: 'hotspot') {
  if (window.parent === window) return
  window.parent.postMessage({
    type: PAGEFLOW_NAVIGATE_MESSAGE,
    to,
    location,
    ...(interaction ? { interaction } : {}),
  }, window.location.origin)
}

const hotspotHoverTargets = new WeakMap<Element, string[]>()
const hotspotOverlaysByElement = new WeakMap<Element, Set<HTMLElement>>()
let hoveredHotspotElement: Element | undefined
let hotspotHoverDelegationBound = false

function notifyHotspotHover(element?: Element) {
  const activeOverlays = element ? hotspotOverlaysByElement.get(element) : undefined
  document.querySelectorAll<HTMLElement>('[data-unplugin-pageflow-hotspot]').forEach(overlay => {
    overlay.style.opacity = !element ? '0.5' : activeOverlays?.has(overlay) ? '1' : '0.25'
  })
  if (window.parent === window) return
  const targets = element ? hotspotHoverTargets.get(element) ?? [] : []
  window.parent.postMessage(targets.length ? {
    type: PAGEFLOW_HOTSPOT_HOVER_MESSAGE,
    targets,
    hotspot: hotspotCenter(element!),
  } : { type: PAGEFLOW_HOTSPOT_HOVER_MESSAGE }, window.location.origin)
}

function hotspotElementFrom(target: EventTarget | null) {
  let element = target instanceof Element ? target : undefined
  while (element && !hotspotHoverTargets.has(element)) element = element.parentElement ?? undefined
  return element
}

function bindHotspotHoverDelegation() {
  if (hotspotHoverDelegationBound) return
  hotspotHoverDelegationBound = true
  document.addEventListener('pointermove', event => {
    const element = hotspotElementFrom(event.target)
    if (element === hoveredHotspotElement) return
    hoveredHotspotElement = element
    notifyHotspotHover(element)
  }, true)
  document.addEventListener('pointerleave', () => {
    if (!hoveredHotspotElement) return
    hoveredHotspotElement = undefined
    notifyHotspotHover()
  }, true)
}

function bindHotspotHover(element: Element, targets: string[]) {
  hotspotHoverTargets.set(element, targets)
  bindHotspotHoverDelegation()
}

function addHotspot(layer: HTMLElement, element: Element, type: 'link' | 'event', targets: string[], locations = targets) {
  const rect = element.getBoundingClientRect()
  if (!rect.width || !rect.height) return false
  const overlay = document.createElement('div')
  overlay.setAttribute('data-unplugin-pageflow-hotspot', type)
  overlay.setAttribute('data-unplugin-pageflow-targets', targets.join('\n'))
  const background = type === 'link' ? 'rgba(255, 92, 168, 0.2)' : 'rgba(101, 191, 255, 0.2)'
  const border = type === 'link' ? 'rgba(255, 92, 168, 0.2)' : 'rgba(101, 191, 255, 0.2)'
  Object.assign(overlay.style, {
    position: 'absolute',
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.top + window.scrollY}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    background,
    border: `1px solid ${border}`,
    boxSizing: 'border-box',
    pointerEvents: targets.length ? 'auto' : 'none',
    cursor: 'default',
    opacity: '0.5',
    transition: 'opacity 500ms ease-out',
  })
  layer.append(overlay)
  const overlays = hotspotOverlaysByElement.get(element) ?? new Set<HTMLElement>()
  overlays.add(overlay)
  hotspotOverlaysByElement.set(element, overlays)
  if (targets.length) {
    hotspotHoverTargets.set(overlay, targets)
    hotspotOverlaysByElement.set(overlay, new Set([overlay]))
    let pointerNavigationAt = 0
    const navigate = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      notifyNavigation(targets[0], locations[0] ?? targets[0], 'hotspot')
    }
    overlay.addEventListener('pointerdown', event => {
      pointerNavigationAt = performance.now()
      navigate(event)
    })
    overlay.addEventListener('click', event => {
      if (performance.now() - pointerNavigationAt < 500) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      navigate(event)
    })
  }
  bindHotspotHover(element, targets)
  return true
}

function hotspotCenter(element: Element) {
  const rect = element.getBoundingClientRect()
  const root = document.documentElement
  const width = Math.max(1, root.clientWidth, window.innerWidth)
  const height = Math.max(1, root.clientHeight, window.innerHeight)
  return {
    centerX: (rect.left + rect.width / 2) / width,
    centerY: (rect.top + rect.height / 2) / height,
  }
}

function isFormControlRegion(element: Element) {
  if (element.matches('input, textarea, select, option, [contenteditable="true"]')) return true
  if (element.matches('a[href], button, [role="link"], [role="button"], uni-button')) return false
  return element.matches('label') || element.querySelector('input, textarea, select, [contenteditable="true"]') != null
}

function hasClickHandler(element: Element) {
  // uni-app wraps native inputs in clickable label/view components. Their
  // focus and model handlers must not become navigation hotspots either.
  if (isFormControlRegion(element)) return false
  const rendered = element as VueRenderedElement
  const component = rendered.__vueParentComponent
  if (component && (component.vnode?.el === element || component.subTree?.el === element)) {
    const props = { ...component.vnode?.props, ...component.subTree?.props }
    if (props && Object.keys(props).some(key => /^onClick(?:Once|Capture|Passive)*$/i.test(key))) return true
  }
  return (element as HTMLElement).onclick != null
}

function collectLinks(router: PageFlowRouterAdapter) {
  let layer = document.querySelector<HTMLElement>('[data-unplugin-pageflow-hotspot-layer]')
  if (!layer) {
    layer = document.createElement('div')
    layer.setAttribute('data-unplugin-pageflow-hotspot-layer', '')
    Object.assign(layer.style, {
      position: 'absolute',
      inset: '0',
      display: 'none',
      pointerEvents: 'none',
      zIndex: '2147483647',
    })
    document.body.append(layer)
  }
  layer.replaceChildren()

  const links: PageFlowRuntimeLink[] = [...programmaticLinks.values()]
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
    if (anchor.closest('[data-unplugin-pageflow-launcher]')) return
    const target = new URL(anchor.href, window.location.href)
    if (target.origin !== window.location.origin) return
    const label = anchor.getAttribute('aria-label')?.trim()
      || anchor.textContent?.trim()
      || target.pathname
    const navigation = router.resolveAnchor(target)
    if (!addHotspot(layer, anchor, 'link', [navigation.path], [navigation.location])) return
    links.push({ label, to: navigation.path, location: navigation.location, hotspot: hotspotCenter(anchor) })
  })
  document.querySelectorAll<HTMLElement>('[data-pageflow-to]').forEach(element => {
    if (element.closest('[data-unplugin-pageflow-launcher]')) return
    const declaredTarget = element.dataset.pageflowTo
    const to = declaredTarget && router.resolve(declaredTarget)?.path
    if (!to || !addHotspot(layer!, element, 'link', [to], [declaredTarget!])) return
    links.push({ label: element.getAttribute('aria-label')?.trim() || element.textContent?.trim() || to, to, location: declaredTarget, hotspot: hotspotCenter(element) })
  })
  document.body.querySelectorAll('*').forEach(element => {
    if (element.closest('[data-unplugin-pageflow-hotspot-layer], [data-unplugin-pageflow-launcher]') || !hasClickHandler(element)) return
    if (element.closest('a[href]')) return
    if (element.querySelector('a[href]')) return
    if (element.hasAttribute('data-pageflow-to')) return
    const label = element.getAttribute('aria-label')?.trim() || element.textContent?.trim() || 'Navigation'
    const targets = router.renderedNavigationTargets?.(element) ?? []
    // A click handler alone is not a page relationship (checkboxes, inputs,
    // accordions, etc.). Only render an event hotspot after a navigation
    // target has actually been resolved.
    if (!targets.length || !addHotspot(layer!, element, 'event', targets)) return
    const hotspot = hotspotCenter(element)
    targets.forEach(to => links.push({ label, to, hotspot }))
  })
  programmaticElements.forEach((targetLocations, element) => {
    if (isFormControlRegion(element)) return
    if (element.closest('a[href], [data-pageflow-to]')) return
    addHotspot(layer!, element, 'event', [...targetLocations.keys()], [...targetLocations.values()])
  })
  const uniqueLinks = new Map<string, PageFlowRuntimeLink>()
  links.forEach(link => {
    const centerX = link.hotspot?.centerX.toFixed(4) ?? 'none'
    const centerY = link.hotspot?.centerY.toFixed(4) ?? 'none'
    uniqueLinks.set(`${link.to}:${centerX}:${centerY}`, link)
  })
  return [...uniqueLinks.values()]
}

async function publishPage(router: PageFlowRouterAdapter, config: ResolvedPageFlowOptions) {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  const path = router.currentPath()
  const page = { path, title: document.title, links: collectLinks(router) }
  await fetch(`${config.previewPath}api/page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(page),
  })
  if (window.parent !== window)
    window.parent.postMessage({ type: PAGEFLOW_PAGE_REPORTED_MESSAGE, path }, window.location.origin)
  return page
}

async function scanRenderedPage(router: PageFlowRouterAdapter) {
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  return { path: router.currentPath(), title: document.title, links: collectLinks(router) }
}

function protectPreviewInteractions(router: PageFlowRouterAdapter, config: ResolvedPageFlowOptions) {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  document.addEventListener('click', event => {
    lastClickedElement = event.target as Element | null
    setTimeout(() => { lastClickedElement = null })
    const anchor = lastClickedElement?.closest<HTMLAnchorElement>('a[href]')
    if (anchor) {
      event.preventDefault()
      event.stopImmediatePropagation()
      const navigation = router.resolveAnchor(new URL(anchor.href, window.location.href))
      notifyNavigation(navigation.path, navigation.location)
    }
  }, true)
  document.addEventListener('submit', event => event.preventDefault(), true)

  router.interceptNavigation((navigation, method) => {
      const target = navigation.path
      if (target) {
        const element = lastClickedElement?.closest('a, button, [role="link"], [role="button"], uni-button, uni-view')
          ?? lastClickedElement
        const label = element?.textContent?.trim() || `${method} ${target}`
        programmaticLinks.set(`${router.currentPath()}:${target}`, {
          label,
          to: target,
          location: navigation.location,
          hotspot: element ? hotspotCenter(element) : undefined,
        })
        if (element) associateProgrammaticElement(element, target, navigation.location)
        if (element) notifyNavigation(target, navigation.location)
        void publishPage(router, config)
      }
  })

  const uni = (window as Window & { uni?: UniNavigationApi }).uni
  ;(['navigateTo', 'redirectTo', 'switchTab', 'reLaunch'] as const).forEach(method => {
    if (!uni?.[method]) return
    uni[method] = (options: UniNavigationOptions) => {
      const location = options?.url
      const target = location && router.resolve(location)?.path
      if (target) {
        const element = lastClickedElement?.closest('a, button, [role="link"], [role="button"], uni-button, uni-view')
          ?? lastClickedElement
        const label = element?.textContent?.trim() || `${method} ${target}`
        programmaticLinks.set(`${router.currentPath()}:${target}`, {
          label,
          to: target,
          location,
          hotspot: element ? hotspotCenter(element) : undefined,
        })
        if (element) associateProgrammaticElement(element, target, location)
        if (element) notifyNavigation(target, location)
        void publishPage(router, config)
      }
      const result = { errMsg: `${method}:ok` }
      queueMicrotask(() => {
        options?.success?.(result)
        options?.complete?.(result)
      })
      return Promise.resolve(result)
    }
  })
}

function observePage(router: PageFlowRouterAdapter, config: ResolvedPageFlowOptions) {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  let timer: ReturnType<typeof setTimeout> | undefined
  const update = () => {
    clearTimeout(timer)
    timer = setTimeout(() => void publishPage(router, config), 100)
  }
  const observer = new MutationObserver(records => {
    if (records.every(record => (record.target as Element).closest?.('[data-unplugin-pageflow-hotspot-layer], [data-unplugin-pageflow-launcher]'))) return
    update()
  })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] })
  const titleObserver = new MutationObserver(update)
  titleObserver.observe(document.head, { childList: true, characterData: true, subtree: true })
  window.addEventListener('resize', update)
}

export async function startPageFlowRuntime(config: ResolvedPageFlowOptions) {
  if (!config.enabled) return

  preservePreviewWebGLFrames()
  mountPageFlowLauncher(config)

  if (config.routes?.length) window.__UNPLUGIN_PAGEFLOW_ROUTES__ = config.routes

  trackPreviewRequests()
  repairPreviewAssetUrls(config)
  Object.assign(window, {
    __UNPLUGIN_PAGEFLOW_READY__: () => window.dispatchEvent(new Event(PAGEFLOW_READY_EVENT)),
  })

  let router: PageFlowRouterAdapter | undefined
  for (let attempt = 0; attempt < 50 && !router; attempt++) {
    router = findVueRouterAdapter() ?? findBrowserHistoryAdapter()
    if (!router) await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (!router) return
  startPageFlowDomStatePersistence()
  const previewMode = new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)
  protectPreviewInteractions(router, config)
  if (!previewMode) await publishRoutes(router, config)
  await publishPage(router, config)
  const runtimeWindow = window as PageFlowWindow
  if (!runtimeWindow.__UNPLUGIN_PAGEFLOW_SCAN_BOUND__) {
    runtimeWindow.__UNPLUGIN_PAGEFLOW_SCAN_BOUND__ = true
    window.addEventListener('message', event => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === PAGEFLOW_SCAN_MESSAGE) {
        void scanRenderedPage(router!).then(page => {
          if (window.parent !== window)
            window.parent.postMessage({ type: PAGEFLOW_SCAN_RESULT_MESSAGE, page }, window.location.origin)
        })
        return
      }
      if (event.data?.type === PAGEFLOW_DIAGNOSTICS_SCAN_MESSAGE) {
        void scanRenderedPage(router!).then(async (page) => {
          if (window.parent !== window) {
            window.parent.postMessage({
              type: PAGEFLOW_DIAGNOSTICS_RESULT_MESSAGE,
              path: page.path,
              diagnostics: await scanPageDiagnostics(config.diagnostics),
            }, window.location.origin)
          }
        })
        return
      }
      if (event.data?.type === PAGEFLOW_DIAGNOSTIC_HIGHLIGHT_MESSAGE && typeof event.data.selector === 'string')
        highlightDiagnosticElement(event.data.selector)
    })
  }
  if (previewMode && !runtimeWindow.__UNPLUGIN_PAGEFLOW_SCROLL_SCAN_BOUND__) {
    runtimeWindow.__UNPLUGIN_PAGEFLOW_SCROLL_SCAN_BOUND__ = true
    let scrollTimer: ReturnType<typeof setTimeout> | undefined
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        scrollTimer = undefined
        void scanRenderedPage(router!).then(page => {
          if (window.parent !== window)
            window.parent.postMessage({ type: PAGEFLOW_SCAN_RESULT_MESSAGE, page }, window.location.origin)
        })
      }, 32)
    }, true)
  }
  observePage(router, config)
  router.onRouteChange(() => {
    if (!previewMode) void publishRoutes(router, config)
    void publishPage(router, config)
  })
}
