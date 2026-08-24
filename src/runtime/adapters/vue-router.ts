import type { PageFlowRuntimeRoute, PageFlowRouteMode } from '../../shared/types'
import type { PageFlowResolvedNavigation, PageFlowRouterAdapter } from './types'

interface RouterRecordLike {
  name?: string | symbol | null
  path: string
  meta?: Record<string, unknown>
  components?: Record<string, unknown>
  redirect?: unknown
  aliasOf?: RouterRecordLike
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
  __vue_app__?: { config?: { globalProperties?: { $router?: RouterLike } } }
}

interface VueRenderedElement extends Element {
  __vueParentComponent?: {
    vnode?: { el?: Element; props?: Record<string, unknown> | null }
    subTree?: { el?: Element; props?: Record<string, unknown> | null }
    setupState?: Record<string, unknown>
    parent?: VueRenderedElement['__vueParentComponent']
  }
}

export class VueRouterAdapter implements PageFlowRouterAdapter {
  readonly name = 'vue-router'

  constructor(private readonly router: RouterLike) {}

  routes(): PageFlowRuntimeRoute[] {
    return this.router.getRoutes().map(route => {
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
        redirect: typeof route.redirect === 'string'
          ? route.redirect
          : route.redirect && typeof route.redirect === 'object' && typeof (route.redirect as { path?: unknown }).path === 'string'
            ? (route.redirect as { path: string }).path
            : undefined,
        aliasOf: route.aliasOf?.path,
        catchAll: /:[^/]+\(\.\*\)/.test(route.path),
      }
    })
  }

  routeMode(): PageFlowRouteMode {
    return this.router.options?.history?.createHref?.('/').includes('#') || window.location.hash.startsWith('#/')
      ? 'hash'
      : 'history'
  }

  currentPath() {
    const matched = this.router.currentRoute?.value?.matched
    return matched?.[matched.length - 1]?.path
      ?? this.router.currentRoute?.value?.path
      ?? window.location.pathname
  }

  resolve(to: unknown): PageFlowResolvedNavigation | undefined {
    const resolved = this.router.resolve?.(to)
    const matched = resolved?.matched
    const matchedPath = matched?.[matched.length - 1]?.path
    if (matched && (!matchedPath || /:[^/]+\(\.\*\)/.test(matchedPath))) return undefined
    const path = matchedPath ?? resolved?.path
    return path ? { path, location: resolved?.fullPath ?? resolved?.path ?? path } : undefined
  }

  resolveAnchor(target: URL): PageFlowResolvedNavigation {
    if (target.hash.startsWith('#/')) {
      const location = target.hash.slice(1)
      return { path: this.resolve(location)?.path ?? location.split(/[?#]/, 1)[0], location }
    }
    const base = this.router.options?.history?.base?.replace(/\/$/, '') ?? ''
    const pathname = base && target.pathname.startsWith(`${base}/`) ? target.pathname.slice(base.length) : target.pathname
    const location = `${pathname}${target.search}${target.hash}`
    return { path: this.resolve(pathname)?.path ?? pathname, location }
  }

  interceptNavigation(callback: (navigation: PageFlowResolvedNavigation, method: string) => void) {
    ;(['push', 'replace'] as const).forEach(method => {
      if (!this.router[method]) return
      const navigate = this.router[method].bind(this.router)
      this.router[method] = (to: unknown) => {
        const navigation = this.resolve(to)
        if (navigation) callback(navigation, method)
        return navigate(to)
      }
    })
  }

  renderedNavigationTargets(element: Element) {
    const component = (element as VueRenderedElement).__vueParentComponent
    if (!component) return []
    const sources: string[] = []
    const components: NonNullable<VueRenderedElement['__vueParentComponent']>[] = []
    const handlers = { ...component.vnode?.props, ...component.subTree?.props }
    Object.entries(handlers ?? {}).forEach(([key, value]) => {
      if (/^onClick(?:Once|Capture|Passive)*$/i.test(key) && typeof value === 'function') sources.push(value.toString())
    })
    let current: VueRenderedElement['__vueParentComponent'] = component
    for (let depth = 0; current && depth < 4; depth++, current = current.parent) {
      components.push(current)
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
        const target = this.resolve(match[2])?.path
        if (target) targets.add(target)
      }
      for (const match of source.matchAll(/(["'`])(\/[^"'`$]*)/g)) {
        const target = this.resolve(match[2])?.path
        if (target) targets.add(target)
      }
    })
    const navigationSources = sources.filter(source => /\b(?:push|replace|navigateTo|redirectTo|switchTab|reLaunch)\s*\(/.test(source))
    components.forEach(current => {
      const props = { ...current.vnode?.props, ...current.subTree?.props }
      for (const key of ['url', 'to', 'path', 'href']) {
        const value = props?.[key]
        if (typeof value !== 'string' || !value.startsWith('/')) continue
        if (!navigationSources.some(source => new RegExp(`\\b${key}\\b`).test(source))) continue
        const target = this.resolve(value)?.path
        if (target) targets.add(target)
      }
    })
    return [...targets]
  }

  onRouteChange(callback: () => void) {
    return this.router.afterEach?.(callback)
  }
}

export function findVueRouterAdapter() {
  const containers = document.querySelectorAll<VueAppContainer>('[data-v-app], #app, #__nuxt')
  for (const container of containers) {
    const router = container.__vue_app__?.config?.globalProperties?.$router
    if (router?.getRoutes) return new VueRouterAdapter(router)
  }
}
