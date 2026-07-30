import type {
  PageFlowRuntimeLink,
  PageFlowRuntimeRoute,
  PageFlowRouteMode,
  ResolvedPageFlowOptions,
} from '../shared/types'
import { PAGEFLOW_PREVIEW_PARAM } from './index'
import { PAGEFLOW_NAVIGATE_MESSAGE, PAGEFLOW_NETWORK_EVENT, PAGEFLOW_PAGE_REPORTED_MESSAGE, PAGEFLOW_READY_EVENT, PAGEFLOW_WHEEL_MESSAGE } from '../shared/protocol'

interface PageFlowWindow extends Window {
  __UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__?: () => number
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
    update(1)
    return originalFetch(...args).finally(() => update(-1))
  }

  const originalSend = window.XMLHttpRequest.prototype.send
  window.XMLHttpRequest.prototype.send = function (...args) {
    update(1)
    this.addEventListener('loadend', () => update(-1), { once: true })
    return originalSend.apply(this, args)
  }
}

interface RouterRecordLike {
  name?: string | symbol | null
  path: string
  meta?: Record<string, unknown>
  components?: Record<string, unknown>
}

interface RouterLike {
  options?: { history?: { base?: string; createHref?(location: string): string } }
  getRoutes(): RouterRecordLike[]
  currentRoute?: { value?: { path?: string; fullPath?: string; matched?: RouterRecordLike[] } }
  resolve?(to: unknown): { path?: string; fullPath?: string; matched?: RouterRecordLike[] }
  push?(to: unknown): unknown
  replace?(to: unknown): unknown
  afterEach?(callback: () => void): () => void
}

interface VueAppContainer extends Element {
  __vue_app__?: {
    config?: {
      globalProperties?: {
        $router?: RouterLike
      }
    }
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

function findRouter() {
  const containers = document.querySelectorAll<VueAppContainer>('[data-v-app], #app')
  for (const container of containers) {
    const router = container.__vue_app__?.config?.globalProperties?.$router
    if (router?.getRoutes) return router
  }
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

function normalizeRoutes(router: RouterLike): PageFlowRuntimeRoute[] {
  return router.getRoutes().map(route => {
    const name = route.name == null ? undefined : String(route.name)
    const metaTitle = route.meta?.title
    const component = route.components?.default as { __file?: unknown } | (() => unknown) | undefined
    let componentFile: string | undefined
    if (component && typeof component === 'object' && typeof component.__file === 'string')
      componentFile = component.__file.replaceAll('\\', '/')
    else if (typeof component === 'function')
      componentFile = component.toString().match(/["']([^"']+\.vue)["']/)?.[1]?.replaceAll('\\', '/')
    return {
      id: name ?? route.path,
      name,
      path: route.path,
      title: typeof metaTitle === 'string' ? metaTitle : name ?? route.path,
      componentFile,
    }
  })
}

async function publishRoutes(router: RouterLike, config: ResolvedPageFlowOptions) {
  const routeMode: PageFlowRouteMode = router.options?.history?.createHref?.('/').includes('#')
    || window.location.hash.startsWith('#/')
    ? 'hash'
    : 'history'
  await fetch(`${config.previewPath}api/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeMode, routes: normalizeRoutes(router) }),
  })
}

const programmaticLinks = new Map<string, PageFlowRuntimeLink>()
const programmaticElements = new Map<Element, Set<string>>()

function associateProgrammaticElement(element: Element, target: string) {
  const targets = programmaticElements.get(element) ?? new Set<string>()
  targets.add(target)
  programmaticElements.set(element, targets)
}
let lastClickedElement: Element | null = null

function routePath(router: RouterLike) {
  const matched = router.currentRoute?.value?.matched
  return matched?.[matched.length - 1]?.path
    ?? router.currentRoute?.value?.path
    ?? window.location.pathname
}

function targetPath(router: RouterLike, to: unknown) {
  const resolved = router.resolve?.(to)
  const matched = resolved?.matched
  return matched?.[matched.length - 1]?.path ?? resolved?.path
}

function anchorRoutePath(router: RouterLike, target: URL) {
  if (target.hash.startsWith('#/')) return target.hash.slice(1)
  const base = router.options?.history?.base?.replace(/\/$/, '') ?? ''
  if (base && target.pathname.startsWith(`${base}/`)) return target.pathname.slice(base.length)
  return target.pathname
}

function notifyNavigation(to: string, location = to) {
  if (window.parent === window) return
  window.parent.postMessage({ type: PAGEFLOW_NAVIGATE_MESSAGE, to, location }, window.location.origin)
}

function anchorNavigationLocation(router: RouterLike, target: URL) {
  if (target.hash.startsWith('#/')) return target.hash.slice(1)
  const base = router.options?.history?.base?.replace(/\/$/, '') ?? ''
  const pathname = base && target.pathname.startsWith(`${base}/`) ? target.pathname.slice(base.length) : target.pathname
  return `${pathname}${target.search}${target.hash}`
}

function forwardPreviewWheel() {
  if (window.parent === window) return
  window.addEventListener('wheel', event => {
    event.preventDefault()
    window.parent.postMessage({
      type: PAGEFLOW_WHEEL_MESSAGE,
      clientX: event.clientX,
      clientY: event.clientY,
      deltaMode: event.deltaMode,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    }, window.location.origin)
  }, { passive: false })
}

function addHotspot(layer: HTMLElement, element: Element, type: 'link' | 'event', targets: string[]) {
  const rect = element.getBoundingClientRect()
  if (!rect.width || !rect.height) return false
  const overlay = document.createElement('div')
  overlay.setAttribute('data-unplugin-pageflow-hotspot', type)
  overlay.setAttribute('data-unplugin-pageflow-targets', targets.join('\n'))
  const color = type === 'link' ? '#ff5ca8' : '#65bfff'
  const background = type === 'link' ? 'rgba(255, 92, 168, 0.18)' : 'rgba(101, 191, 255, 0.18)'
  Object.assign(overlay.style, {
    position: 'absolute',
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.top + window.scrollY}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    border: `2px solid ${color}`,
    background,
    boxSizing: 'border-box',
    pointerEvents: 'none',
  })
  layer.append(overlay)
  return true
}

function hotspotCenter(element: Element) {
  const rect = element.getBoundingClientRect()
  const root = document.documentElement
  const width = Math.max(1, root.scrollWidth, window.innerWidth)
  const height = Math.max(1, root.scrollHeight, window.innerHeight)
  return {
    centerX: (rect.left + window.scrollX + rect.width / 2) / width,
    centerY: (rect.top + window.scrollY + rect.height / 2) / height,
  }
}

function hasClickHandler(element: Element) {
  const rendered = element as VueRenderedElement
  const component = rendered.__vueParentComponent
  if (component && (component.vnode?.el === element || component.subTree?.el === element)) {
    const props = { ...component.vnode?.props, ...component.subTree?.props }
    if (props && Object.keys(props).some(key => /^onClick(?:Once|Capture|Passive)*$/i.test(key))) return true
  }
  return (element as HTMLElement).onclick != null
}

function renderedNavigationTargets(element: Element, router: RouterLike) {
  const component = (element as VueRenderedElement).__vueParentComponent
  if (!component) return []
  const sources: string[] = []
  const handlers = { ...component.vnode?.props, ...component.subTree?.props }
  Object.entries(handlers ?? {}).forEach(([key, value]) => {
    if (/^onClick(?:Once|Capture|Passive)*$/i.test(key) && typeof value === 'function') sources.push(value.toString())
  })
  let current: VueRenderedElement['__vueParentComponent'] = component
  for (let depth = 0; current && depth < 4; depth++, current = current.parent) {
    const listeners = current.vnode?.props ?? {}
    for (const source of [...sources]) {
      for (const emitted of source.matchAll(/(?:\$?emit)\s*\(\s*(["'])([^"']+)\1/g)) {
        const listener = `on${emitted[2].charAt(0).toUpperCase()}${emitted[2].slice(1)}`
        const candidate = listeners[listener]
        if (typeof candidate === 'function' && !sources.includes(candidate.toString())) sources.push(candidate.toString())
      }
    }
    const setupState = current.setupState ?? {}
    for (const source of [...sources]) {
      for (const identifier of source.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
        const candidate = setupState[identifier[1]]
        if (typeof candidate === 'function' && !sources.includes(candidate.toString())) sources.push(candidate.toString())
      }
    }
  }
  const targets = new Set<string>()
  const pattern = /\b(?:push|replace|navigateTo|redirectTo|switchTab|reLaunch)\s*\(\s*(?:\{\s*(?:url|path)\s*:\s*)?(["'`])([^"'`$]+)/g
  sources.forEach(source => {
    for (const match of source.matchAll(pattern)) {
      const target = targetPath(router, match[2])
      if (target) targets.add(target)
    }
    for (const match of source.matchAll(/(["'`])(\/[^"'`$]*)/g)) {
      const target = targetPath(router, match[2])
      if (target) targets.add(target)
    }
  })
  return [...targets]
}

function collectLinks(router: RouterLike) {
  let layer = document.querySelector<HTMLElement>('[data-unplugin-pageflow-hotspot-layer]')
  if (!layer) {
    layer = document.createElement('div')
    layer.setAttribute('data-unplugin-pageflow-hotspot-layer', '')
    Object.assign(layer.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '2147483647',
    })
    document.body.append(layer)
  }
  layer.replaceChildren()

  const links: PageFlowRuntimeLink[] = [...programmaticLinks.values()]
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
    const target = new URL(anchor.href, window.location.href)
    if (target.origin !== window.location.origin) return
    const label = anchor.getAttribute('aria-label')?.trim()
      || anchor.textContent?.trim()
      || target.pathname
    const anchorPath = anchorRoutePath(router, target)
    const matched = router.resolve?.(anchorPath).matched
    const routePath = matched?.[matched.length - 1]?.path ?? anchorPath
    if (!addHotspot(layer, anchor, 'link', [routePath])) return
    links.push({ label, to: routePath, hotspot: hotspotCenter(anchor) })
  })
  document.body.querySelectorAll('*').forEach(element => {
    if (element.closest('[data-unplugin-pageflow-hotspot-layer]') || !hasClickHandler(element)) return
    if (element.closest('a[href]')) return
    const label = element.getAttribute('aria-label')?.trim() || element.textContent?.trim() || 'Navigation'
    const targets = renderedNavigationTargets(element, router)
    const type = targets.length ? 'link' : 'event'
    if (!addHotspot(layer!, element, type, targets) || !targets.length) return
    const hotspot = hotspotCenter(element)
    targets.forEach(to => links.push({ label, to, hotspot }))
  })
  programmaticElements.forEach((targets, element) => addHotspot(layer!, element, 'link', [...targets]))
  return links
}

async function publishPage(router: RouterLike, config: ResolvedPageFlowOptions) {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  const path = routePath(router)
  await fetch(`${config.previewPath}api/page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, title: document.title, links: collectLinks(router) }),
  })
  if (window.parent !== window)
    window.parent.postMessage({ type: PAGEFLOW_PAGE_REPORTED_MESSAGE, path }, window.location.origin)
}

function protectPreviewInteractions(router: RouterLike, config: ResolvedPageFlowOptions) {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  document.addEventListener('click', event => {
    lastClickedElement = event.target as Element | null
    setTimeout(() => { lastClickedElement = null })
    const anchor = lastClickedElement?.closest<HTMLAnchorElement>('a[href]')
    if (anchor) {
      event.preventDefault()
      const target = anchorRoutePath(router, new URL(anchor.href, window.location.href))
      notifyNavigation(targetPath(router, target) ?? target, anchorNavigationLocation(router, new URL(anchor.href, window.location.href)))
    }
  }, true)
  document.addEventListener('submit', event => event.preventDefault(), true)

  ;(['push', 'replace'] as const).forEach(method => {
    const original = router[method]
    if (!original) return
    router[method] = (to: unknown) => {
      const target = targetPath(router, to)
      if (target) {
        const element = lastClickedElement?.closest('a, button, [role="link"], [role="button"], uni-button, uni-view')
          ?? lastClickedElement
        const label = element?.textContent?.trim() || `${method} ${target}`
        programmaticLinks.set(`${routePath(router)}:${target}`, {
          label,
          to: target,
          hotspot: element ? hotspotCenter(element) : undefined,
        })
        if (element) associateProgrammaticElement(element, target)
        const resolved = router.resolve?.(to)
        if (element) notifyNavigation(target, resolved?.fullPath ?? resolved?.path ?? target)
        void publishPage(router, config)
      }
      return Promise.resolve()
    }
  })

  const uni = (window as Window & { uni?: UniNavigationApi }).uni
  ;(['navigateTo', 'redirectTo', 'switchTab', 'reLaunch'] as const).forEach(method => {
    if (!uni?.[method]) return
    uni[method] = (options: UniNavigationOptions) => {
      const location = options?.url
      const target = location && targetPath(router, location)
      if (target) {
        const element = lastClickedElement?.closest('a, button, [role="link"], [role="button"], uni-button, uni-view')
          ?? lastClickedElement
        const label = element?.textContent?.trim() || `${method} ${target}`
        programmaticLinks.set(`${routePath(router)}:${target}`, {
          label,
          to: target,
          hotspot: element ? hotspotCenter(element) : undefined,
        })
        if (element) associateProgrammaticElement(element, target)
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

function observePage(router: RouterLike, config: ResolvedPageFlowOptions) {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  let timer: ReturnType<typeof setTimeout> | undefined
  const update = () => {
    clearTimeout(timer)
    timer = setTimeout(() => void publishPage(router, config), 100)
  }
  const observer = new MutationObserver(records => {
    if (records.every(record => (record.target as Element).closest?.('[data-unplugin-pageflow-hotspot-layer]'))) return
    update()
  })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] })
  const titleObserver = new MutationObserver(update)
  titleObserver.observe(document.head, { childList: true, characterData: true, subtree: true })
  window.addEventListener('resize', update)
}

export async function startPageFlowRuntime(config: ResolvedPageFlowOptions) {
  if (!config.enabled) return

  trackPreviewRequests()
  repairPreviewAssetUrls(config)
  Object.assign(window, {
    __UNPLUGIN_PAGEFLOW_READY__: () => window.dispatchEvent(new Event(PAGEFLOW_READY_EVENT)),
  })

  let router: RouterLike | undefined
  for (let attempt = 0; attempt < 50 && !router; attempt++) {
    router = findRouter()
    if (!router) await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (!router) return
  const previewMode = new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)
  if (previewMode) forwardPreviewWheel()
  protectPreviewInteractions(router, config)
  if (!previewMode) await publishRoutes(router, config)
  await publishPage(router, config)
  observePage(router, config)
  router.afterEach?.(() => {
    if (!previewMode) void publishRoutes(router, config)
    void publishPage(router, config)
  })
}
