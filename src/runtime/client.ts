import type {
  PageFlowRuntimeLink,
  ResolvedPageFlowOptions,
} from '../shared/types'
import { startPageFlowDomStatePersistence } from './state.ts'
import { hasPageFlowInspection, hasPageFlowPreview, PAGEFLOW_API_RESULT_MESSAGE, PAGEFLOW_DIAGNOSTIC_HIGHLIGHT_MESSAGE, PAGEFLOW_DIAGNOSTICS_RESULT_MESSAGE, PAGEFLOW_DIAGNOSTICS_SCAN_MESSAGE, PAGEFLOW_ESCAPE_MESSAGE, PAGEFLOW_FORM_COMMAND_MESSAGE, PAGEFLOW_FORM_RESULT_MESSAGE, PAGEFLOW_HOTSPOT_HOVER_MESSAGE, PAGEFLOW_NAVIGATE_MESSAGE, PAGEFLOW_NETWORK_EVENT, PAGEFLOW_PAGE_REPORTED_MESSAGE, PAGEFLOW_READY_EVENT, PAGEFLOW_SCAN_MESSAGE, PAGEFLOW_SCAN_RESULT_MESSAGE, PAGEFLOW_WEBGL_CANVAS_ATTRIBUTE } from '../shared/protocol.ts'
import { highlightDiagnosticElement, scanPageDiagnostics } from './diagnostics'
import { applyPageFlowFormValues, scanPageFlowFormControls, undoPageFlowFormFill } from './form-fill'
import type { PageFlowRouterAdapter } from './adapters/types'
import { findVueRouterAdapter } from './adapters/vue-router'
import { findBrowserHistoryAdapter } from './adapters/browser-history'
import { mountPageFlowLauncher } from './launcher'
import { isLocalBusinessApiResponse } from './api-filter'
import { collectApiFields } from './api-fields'
import { instrumentPageFlowNetwork, observePageFlowScroll, pageFlowHotspotCenter, pageFlowInternalLinks, pageFlowLinkLabel } from '@pageflow/runtime'

const pageFlowSearchParams = () => new URLSearchParams(window.location.search)
const apiInspectionEnabled = hasPageFlowInspection(pageFlowSearchParams())
const isPageFlowPreview = () => hasPageFlowPreview(pageFlowSearchParams())
let renderedValuesCache = { expiresAt: 0, value: '' }
function renderedPageValues() {
  const now = performance.now()
  if (now < renderedValuesCache.expiresAt) return renderedValuesCache.value
  const values = [document.body?.innerText ?? '']
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')
    .forEach(element => values.push(element.value))
  document.querySelectorAll<HTMLElement>('[aria-label], [title], img[alt]')
    .forEach(element => values.push(element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? '', element.getAttribute('alt') ?? ''))
  renderedValuesCache = { expiresAt: now + 250, value: values.join('\n') }
  return renderedValuesCache.value
}

function yieldApiInspection() {
  return new Promise<void>((resolve) => {
    if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout: 100 })
    else window.setTimeout(resolve, 0)
  })
}

async function reportApiResult(method: string, url: string, status: number, duration: number, value: unknown, responseSize = 0, contentType = '') {
  if (!apiInspectionEnabled || window.parent === window || url.includes('/__unplugin-pageflow/') || !isLocalBusinessApiResponse(url, window.location.origin, contentType)) return
  const fields = await collectApiFields(value, renderedPageValues(), {
    maximumArrayItems: 20,
    maximumFields: 250,
    yieldEvery: 100,
    yieldToHost: yieldApiInspection,
  })
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
      fields,
    },
  }, window.location.origin)
}

interface PageFlowWindow extends Window {
  __UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__?: () => number
  __UNPLUGIN_PAGEFLOW_SCAN_BOUND__?: boolean
  __UNPLUGIN_PAGEFLOW_SCROLL_SCAN_BOUND__?: boolean
  __UNPLUGIN_PAGEFLOW_ESCAPE_BOUND__?: boolean
  __UNPLUGIN_PAGEFLOW_WEBGL_CAPTURE_BOUND__?: boolean
}

function forwardPreviewEscape() {
  if (!isPageFlowPreview() || window.parent === window) return
  const trackedWindow = window as PageFlowWindow
  if (trackedWindow.__UNPLUGIN_PAGEFLOW_ESCAPE_BOUND__) return
  trackedWindow.__UNPLUGIN_PAGEFLOW_ESCAPE_BOUND__ = true
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.repeat) return
    queueMicrotask(() => {
      if (!event.defaultPrevented)
        window.parent.postMessage({ type: PAGEFLOW_ESCAPE_MESSAGE }, window.location.origin)
    })
  })
}

function markPreviewWebGLCanvases() {
  if (!isPageFlowPreview()) return
  const trackedWindow = window as PageFlowWindow
  if (trackedWindow.__UNPLUGIN_PAGEFLOW_WEBGL_CAPTURE_BOUND__) return
  trackedWindow.__UNPLUGIN_PAGEFLOW_WEBGL_CAPTURE_BOUND__ = true
  const prototype = window.HTMLCanvasElement.prototype
  const originalGetContext = prototype.getContext
  prototype.getContext = function (this: HTMLCanvasElement, contextId: string, options?: Record<string, unknown>) {
    const context = originalGetContext.call(this, contextId, options)
    if (context && (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl'))
      this.setAttribute(PAGEFLOW_WEBGL_CANVAS_ATTRIBUTE, '')
    return context
  } as typeof prototype.getContext
}

function trackPreviewRequests() {
  if (!isPageFlowPreview()) return
  const trackedWindow = window as PageFlowWindow
  if (trackedWindow.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__) return

  const tracker = instrumentPageFlowNetwork(window, {
    onPendingChange: () => window.dispatchEvent(new window.Event(PAGEFLOW_NETWORK_EVENT)),
    onFetchResponse: ({ method, url, startedAt }, response) => {
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
            requestAnimationFrame(() => { void reportApiResult(method, url, response.status, performance.now() - startedAt, value, size, contentType) })
        }).catch(() => requestAnimationFrame(() => { void reportApiResult(method, url, response.status, performance.now() - startedAt, undefined, 0, contentType) }))
        else if (typeof clone.json === 'function')
          void clone.json().then(value => requestAnimationFrame(() => { void reportApiResult(method, url, response.status, performance.now() - startedAt, value, 0, contentType) }))
            .catch(() => undefined)
      }
    },
    onFetchError: ({ method, url, startedAt }) => {
      if (apiInspectionEnabled)
        requestAnimationFrame(() => { void reportApiResult(method, url, 0, performance.now() - startedAt, undefined) })
    },
    onXhrComplete: (current, xhr) => {
      const contentType = xhr.getResponseHeader('content-type') ?? ''
      if (!apiInspectionEnabled || !isLocalBusinessApiResponse(xhr.responseURL || current.url, window.location.origin, contentType)) return
      try {
        const text = xhr.responseType === '' || xhr.responseType === 'text' ? xhr.responseText : ''
        let value: unknown = xhr.responseType === 'json' && xhr.response != null ? xhr.response : text
        if (text && (contentType.includes('json') || /^[\s]*[\[{]/.test(text))) {
          try { value = JSON.parse(text) } catch {}
        }
        const size = text ? new TextEncoder().encode(text).byteLength
          : xhr.response instanceof Blob ? xhr.response.size
            : xhr.response instanceof ArrayBuffer ? xhr.response.byteLength : 0
        requestAnimationFrame(() => { void reportApiResult(current.method, xhr.responseURL || current.url, xhr.status, performance.now() - current.startedAt, value, size, contentType) })
      } catch {}
    },
  })
  trackedWindow.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__ = tracker.pending
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
  if (!isPageFlowPreview()) return
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

type HotspotRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>

function isRectInViewport(rect: HotspotRect) {
  return rect.width > 0 && rect.height > 0
    && rect.left + rect.width > 0 && rect.top + rect.height > 0
    && rect.left < window.innerWidth && rect.top < window.innerHeight
}

function isElementInViewport(element: Element) {
  return isRectInViewport(element.getBoundingClientRect())
}

export function isElementExposed(element: Element, rect: HotspotRect = element.getBoundingClientRect()) {
  if (element.ownerDocument !== document || typeof document.elementFromPoint !== 'function') return true
  const left = Math.max(0, rect.left)
  const right = Math.min(window.innerWidth, rect.left + rect.width)
  const top = Math.max(0, rect.top)
  const bottom = Math.min(window.innerHeight, rect.top + rect.height)
  const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2)
  return !hit || hit === element || element.contains(hit)
}

function hotspotCenter(element: Element, hotspotRect?: HotspotRect) {
  return pageFlowHotspotCenter(element, hotspotRect, document)
}

function addHotspot(layer: HTMLElement, element: Element, type: 'link' | 'event', targets: string[], locations = targets, hotspotRect?: HotspotRect) {
  const rect = hotspotRect ?? element.getBoundingClientRect()
  if (!isRectInViewport(rect)) return false
  if (!rect.width || !rect.height) return false
  if (!hotspotRect && !isElementExposed(element, rect)) return false
  const overlay = document.createElement(targets.length && type === 'link' ? 'a' : 'div')
  overlay.setAttribute('data-unplugin-pageflow-hotspot', type)
  overlay.setAttribute('data-unplugin-pageflow-targets', targets.join('\n'))
  if (overlay instanceof window.HTMLAnchorElement) {
    const location = locations[0] ?? targets[0]
    overlay.href = window.location.hash.startsWith('#/') ? `#${location.startsWith('/') ? location : `/${location}`}` : location
    overlay.setAttribute('aria-label', `Open ${targets[0]}`)
    overlay.addEventListener('click', () => notifyNavigation(targets[0], location, 'hotspot'))
  }
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
  if (targets.length) hotspotHoverTargets.set(overlay, targets)
  if (targets.length && !(overlay instanceof window.HTMLAnchorElement)) {
    hotspotOverlaysByElement.set(overlay, new Set([overlay]))
    let pointerNavigationAt = 0
    const forwardStaleInteraction = (event: Event) => {
      if (hotspotRect) return false
      const current = element.getBoundingClientRect()
      const moved = Math.abs(current.left - rect.left) > 2 || Math.abs(current.top - rect.top) > 2
        || Math.abs(current.width - rect.width) > 2 || Math.abs(current.height - rect.height) > 2
      if (!moved) return false
      event.preventDefault()
      event.stopImmediatePropagation()
      overlay.style.pointerEvents = 'none'
      const pointer = event as PointerEvent
      const target = document.elementFromPoint?.(pointer.clientX, pointer.clientY)
      if (target instanceof window.HTMLElement && target !== layer && !target.closest('[data-unplugin-pageflow-hotspot-layer]')) target.click()
      return true
    }
    const navigate = (event: Event) => {
      if (forwardStaleInteraction(event)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      overlay.style.pointerEvents = 'none'
      if (element instanceof window.HTMLElement) element.click()
      else element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
      queueMicrotask(() => { overlay.style.pointerEvents = 'auto' })
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

function nestedFrameLinks() {
  const links: Array<{ element: HTMLAnchorElement | HTMLAreaElement, target: URL, rect: HotspotRect }> = []
  const visit = (owner: Document, mapRect: (rect: HotspotRect) => HotspotRect) => {
    owner.querySelectorAll<HTMLIFrameElement>('iframe').forEach((frame) => {
      let nestedDocument: Document | null
      let nestedWindow: Window | null
      try {
        nestedDocument = frame.contentDocument
        nestedWindow = frame.contentWindow
        if (!nestedDocument || !nestedWindow) return
      } catch {
        return
      }
      const frameRect = mapRect(frame.getBoundingClientRect())
      if (!isRectInViewport(frameRect)) return
      const scaleX = frameRect.width / Math.max(1, nestedWindow.innerWidth)
      const scaleY = frameRect.height / Math.max(1, nestedWindow.innerHeight)
      const mapNestedRect = (rect: HotspotRect): HotspotRect => ({
        left: frameRect.left + rect.left * scaleX,
        top: frameRect.top + rect.top * scaleY,
        width: rect.width * scaleX,
        height: rect.height * scaleY,
      })
      for (const element of nestedDocument.links) {
        let target: URL
        try {
          const frameLocation = nestedWindow.location.href
          const base = frameLocation.startsWith('http') ? frameLocation : window.location.href
          target = new URL(element.getAttribute('href') ?? element.href, base)
        } catch {
          continue
        }
        if (!['http:', 'https:'].includes(target.protocol) || target.origin !== window.location.origin) continue
        target.hash = ''
        links.push({ element, target, rect: mapNestedRect(element.getBoundingClientRect()) })
      }
      visit(nestedDocument, mapNestedRect)
    })
  }
  visit(document, rect => rect)
  return links
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

function collectLinks(router: PageFlowRouterAdapter, visibleOnly = false) {
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

  const links: PageFlowRuntimeLink[] = visibleOnly ? [] : [...programmaticLinks.values()]
  pageFlowInternalLinks(document).forEach(({ element: anchor, target }) => {
    if (anchor.closest('[data-unplugin-pageflow-launcher]')) return
    if (visibleOnly && !isElementInViewport(anchor)) return
    const label = pageFlowLinkLabel(anchor, target.pathname)
    const navigation = router.resolveAnchor(target)
    if (!addHotspot(layer, anchor, 'link', [navigation.path], [navigation.location])) return
    links.push({ label, to: navigation.path, location: navigation.location, kind: 'link', hotspot: hotspotCenter(anchor) })
  })
  nestedFrameLinks().forEach(({ element: anchor, target, rect }) => {
    if (visibleOnly && !isRectInViewport(rect)) return
    const label = pageFlowLinkLabel(anchor, target.pathname)
    const navigation = router.resolveAnchor(target)
    if (!addHotspot(layer!, anchor, 'link', [navigation.path], [navigation.location], rect)) return
    links.push({ label, to: navigation.path, location: navigation.location, kind: 'link', hotspot: hotspotCenter(anchor, rect) })
  })
  document.querySelectorAll<HTMLElement>('[data-pageflow-to]').forEach(element => {
    if (element.closest('[data-unplugin-pageflow-launcher]')) return
    if (visibleOnly && !isElementInViewport(element)) return
    const declaredTarget = element.dataset.pageflowTo
    const to = declaredTarget && router.resolve(declaredTarget)?.path
    if (!to || !addHotspot(layer!, element, 'link', [to], [declaredTarget!])) return
    links.push({ label: pageFlowLinkLabel(element, to), to, location: declaredTarget, kind: 'link', hotspot: hotspotCenter(element) })
  })
  document.body.querySelectorAll('*').forEach(element => {
    if (element.closest('[data-unplugin-pageflow-hotspot-layer], [data-unplugin-pageflow-launcher]')) return
    if (visibleOnly && !isElementInViewport(element)) return
    if (!hasClickHandler(element)) return
    if (element.closest('a[href]')) return
    if (element.querySelector('a[href]')) return
    if (element.hasAttribute('data-pageflow-to')) return
    const label = element.getAttribute('aria-label')?.trim() || element.textContent?.trim() || 'Navigation'
    const targets = router.renderedNavigationTargets?.(element) ?? []
    if (!addHotspot(layer!, element, 'event', targets) || !targets.length) return
    const hotspot = hotspotCenter(element)
    targets.forEach(to => links.push({ label, to, kind: 'event', hotspot }))
  })
  programmaticElements.forEach((targetLocations, element) => {
    if (isFormControlRegion(element)) return
    if (element.closest('a[href], [data-pageflow-to]')) return
    if (!addHotspot(layer!, element, 'event', [...targetLocations.keys()], [...targetLocations.values()])) return
    if (visibleOnly) {
      const hotspot = hotspotCenter(element)
      targetLocations.forEach((location, to) => links.push({ label: pageFlowLinkLabel(element, to), to, location, kind: 'event', hotspot }))
    }
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
  if (!isPageFlowPreview()) return
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
  return { path: router.currentPath(), title: document.title, links: collectLinks(router, true) }
}

export function interceptNestedFrameLink(
  anchor: HTMLAnchorElement,
  event: Event,
  frame: HTMLIFrameElement,
  router: PageFlowRouterAdapter,
) {
  const frameLocation = frame.contentWindow?.location.href
  const base = frameLocation?.startsWith('http') ? frameLocation : window.location.href
  const target = new URL(anchor.getAttribute('href') ?? anchor.href, base)
  if (target.origin !== window.location.origin) return false
  event.preventDefault()
  event.stopImmediatePropagation()
  const navigation = router.resolveAnchor(target)
  notifyNavigation(navigation.path, navigation.location, 'hotspot')
  return true
}

function protectNestedFrameLinks(router: PageFlowRouterAdapter) {
  const attachedFrames = new WeakSet<HTMLIFrameElement>()
  const attachedDocuments = new WeakSet<Document>()
  const bindDocument = (frame: HTMLIFrameElement) => {
    let nestedDocument: Document | null
    try {
      nestedDocument = frame.contentDocument
    } catch {
      return
    }
    if (!nestedDocument || attachedDocuments.has(nestedDocument)) return
    attachedDocuments.add(nestedDocument)
    nestedDocument.addEventListener('click', (event) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      interceptNestedFrameLink(anchor, event, frame, router)
    }, true)
  }
  const attach = (frame: HTMLIFrameElement) => {
    if (attachedFrames.has(frame)) return
    attachedFrames.add(frame)
    frame.addEventListener('load', () => bindDocument(frame))
    bindDocument(frame)
  }
  document.querySelectorAll<HTMLIFrameElement>('iframe').forEach(attach)
  new MutationObserver(() => {
    document.querySelectorAll<HTMLIFrameElement>('iframe').forEach(attach)
  }).observe(document.body, { childList: true, subtree: true })
}

function protectPreviewInteractions(router: PageFlowRouterAdapter, config: ResolvedPageFlowOptions) {
  if (!isPageFlowPreview()) return
  protectNestedFrameLinks(router)
  document.addEventListener('click', event => {
    lastClickedElement = event.target as Element | null
    setTimeout(() => { lastClickedElement = null })
    const anchor = lastClickedElement?.closest<HTMLAnchorElement>('a[href]')
    if (anchor) {
      if (anchor.closest('[data-unplugin-pageflow-hotspot-layer]')) return
      event.preventDefault()
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
          kind: 'event',
          hotspot: element ? hotspotCenter(element) : undefined,
        })
        if (element) associateProgrammaticElement(element, target, navigation.location)
        notifyNavigation(target, navigation.location)
        void publishPage(router, config)
      }
  })

  const uni = (window as Window & { uni?: UniNavigationApi }).uni
  ;(['navigateTo', 'redirectTo', 'switchTab', 'reLaunch'] as const).forEach(method => {
    if (!uni?.[method]) return
    const navigate = uni[method].bind(uni)
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
          kind: 'event',
          hotspot: element ? hotspotCenter(element) : undefined,
        })
        if (element) associateProgrammaticElement(element, target, location)
        notifyNavigation(target, location)
        void publishPage(router, config)
      }
      return navigate(options)
    }
  })
}

function observePage(router: PageFlowRouterAdapter, config: ResolvedPageFlowOptions) {
  if (!isPageFlowPreview()) return
  // Preview URLs can also be opened as normal top-level tabs. There is no
  // PageFlow parent to consume scan results there, so observing large animated
  // pages (for example Cesium) only creates repeated full-DOM scans.
  if (window.parent === window) return
  let timer: ReturnType<typeof setTimeout> | undefined
  const update = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      void scanRenderedPage(router).then(page => {
        if (window.parent !== window)
          window.parent.postMessage({ type: PAGEFLOW_SCAN_RESULT_MESSAGE, page }, window.location.origin)
      })
    }, 100)
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

  markPreviewWebGLCanvases()
  forwardPreviewEscape()
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
  const previewMode = isPageFlowPreview()
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
      if (event.data?.type === PAGEFLOW_FORM_COMMAND_MESSAGE && typeof event.data.requestId === 'string') {
        const action = event.data.action
        let result: unknown
        let error: string | undefined
        try {
          if (action === 'scan') result = scanPageFlowFormControls()
          else if (action === 'fill' && event.data.values && typeof event.data.values === 'object') result = applyPageFlowFormValues(event.data.values)
          else if (action === 'undo') result = undoPageFlowFormFill()
          else error = '不支持的表单命令'
        } catch (cause) {
          error = cause instanceof Error ? cause.message : '表单命令执行失败'
        }
        if (window.parent !== window) window.parent.postMessage({
          type: PAGEFLOW_FORM_RESULT_MESSAGE,
          requestId: event.data.requestId,
          action,
          result,
          error,
        }, window.location.origin)
      }
    })
  }
  if (previewMode && window.parent !== window && !runtimeWindow.__UNPLUGIN_PAGEFLOW_SCROLL_SCAN_BOUND__) {
    runtimeWindow.__UNPLUGIN_PAGEFLOW_SCROLL_SCAN_BOUND__ = true
    observePageFlowScroll(document, () => {
      void scanRenderedPage(router!).then(page => {
        if (window.parent !== window)
          window.parent.postMessage({ type: PAGEFLOW_SCAN_RESULT_MESSAGE, page }, window.location.origin)
      })
    })
  }
  observePage(router, config)
  router.onRouteChange(() => {
    if (!previewMode) void publishRoutes(router, config)
    void publishPage(router, config)
  })
}
