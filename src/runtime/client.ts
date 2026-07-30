import type {
  PageFlowRuntimeLink,
  PageFlowRuntimeRoute,
  PageFlowRouteMode,
  ResolvedPageFlowOptions,
} from '../shared/types'
import { PAGEFLOW_PREVIEW_PARAM } from './index'
import { PAGEFLOW_NAVIGATE_MESSAGE, PAGEFLOW_PAGE_REPORTED_MESSAGE, PAGEFLOW_READY_EVENT, PAGEFLOW_WHEEL_MESSAGE } from '../shared/protocol'

interface RouterRecordLike {
  name?: string | symbol | null
  path: string
  meta?: Record<string, unknown>
  components?: Record<string, unknown>
}

interface RouterLike {
  options?: { history?: { base?: string; createHref?(location: string): string } }
  getRoutes(): RouterRecordLike[]
  currentRoute?: { value?: { path?: string; matched?: RouterRecordLike[] } }
  resolve?(to: unknown): { path?: string; matched?: RouterRecordLike[] }
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
const programmaticElements = new Set<Element>()
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

function notifyNavigation(to: string) {
  if (window.parent === window) return
  window.parent.postMessage({ type: PAGEFLOW_NAVIGATE_MESSAGE, to }, window.location.origin)
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

function addHotspot(layer: HTMLElement, element: Element) {
  const rect = element.getBoundingClientRect()
  if (!rect.width || !rect.height) return false
  const overlay = document.createElement('div')
  overlay.setAttribute('data-unplugin-pageflow-hotspot', '')
  Object.assign(overlay.style, {
    position: 'absolute',
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.top + window.scrollY}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    border: '2px solid #ff795d',
    background: 'rgb(255 121 93 / 14%)',
    boxSizing: 'border-box',
    pointerEvents: 'none',
  })
  layer.append(overlay)
  return true
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
    if (!addHotspot(layer, anchor)) return

    const label = anchor.getAttribute('aria-label')?.trim()
      || anchor.textContent?.trim()
      || target.pathname
    const anchorPath = anchorRoutePath(router, target)
    const matched = router.resolve?.(anchorPath).matched
    const routePath = matched?.[matched.length - 1]?.path ?? anchorPath
    links.push({ label, to: routePath })
  })
  programmaticElements.forEach(element => addHotspot(layer!, element))
  return links
}

async function publishPage(router: RouterLike, config: ResolvedPageFlowOptions) {
  if (!new URLSearchParams(window.location.search).has(PAGEFLOW_PREVIEW_PARAM)) return
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  const path = routePath(router)
  await fetch(`${config.previewPath}api/page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, links: collectLinks(router) }),
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
      notifyNavigation(targetPath(router, target) ?? target)
    }
  }, true)
  document.addEventListener('submit', event => event.preventDefault(), true)

  ;(['push', 'replace'] as const).forEach(method => {
    const original = router[method]
    if (!original) return
    router[method] = (to: unknown) => {
      const target = targetPath(router, to)
      if (target) {
        const element = lastClickedElement?.closest('button, [role="link"], [role="button"]')
        const label = element?.textContent?.trim() || `${method} ${target}`
        programmaticLinks.set(`${routePath(router)}:${target}`, { label, to: target })
        if (element) programmaticElements.add(element)
        notifyNavigation(target)
        void publishPage(router, config)
      }
      return Promise.resolve()
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
  window.addEventListener('resize', update)
}

export async function startPageFlowRuntime(config: ResolvedPageFlowOptions) {
  if (!config.enabled) return

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
