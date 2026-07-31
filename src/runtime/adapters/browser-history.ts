import type { PageFlowRuntimeRoute } from '../../shared/types'
import type { PageFlowResolvedNavigation, PageFlowRouterAdapter } from './types'

declare global {
  interface Window {
    __UNPLUGIN_PAGEFLOW_ROUTES__?: PageFlowRuntimeRoute[]
  }
}

function normalizePath(path: string) {
  const normalized = path.split(/[?#]/, 1)[0].replace(/\/$/, '')
  return normalized || '/'
}

export class BrowserHistoryAdapter implements PageFlowRouterAdapter {
  readonly name = 'browser-history'

  constructor(private readonly runtimeRoutes: PageFlowRuntimeRoute[]) {}

  routes() { return this.runtimeRoutes }
  routeMode() { return 'history' as const }
  currentPath() { return this.resolve(window.location.href)?.path ?? normalizePath(window.location.pathname) }

  resolve(to: unknown): PageFlowResolvedNavigation | undefined {
    if (typeof to !== 'string' && !(to instanceof URL)) return
    const target = new URL(String(to), window.location.href)
    if (target.origin !== window.location.origin) return
    const pathname = normalizePath(target.pathname)
    const route = this.runtimeRoutes.find(candidate => normalizePath(candidate.path) === pathname)
    return route ? { path: route.path, location: `${target.pathname}${target.search}${target.hash}` } : undefined
  }

  resolveAnchor(target: URL) {
    return this.resolve(target) ?? { path: normalizePath(target.pathname), location: `${target.pathname}${target.search}${target.hash}` }
  }

  interceptNavigation(callback: (navigation: PageFlowResolvedNavigation, method: string) => void) {
    ;(['pushState', 'replaceState'] as const).forEach(method => {
      const original = window.history[method].bind(window.history)
      window.history[method] = ((data: unknown, unused: string, url?: string | URL | null) => {
        if (url != null) {
          const navigation = this.resolve(url)
          if (navigation) callback(navigation, method)
        }
        return original(data, unused, url)
      }) as History[typeof method]
    })
  }

  renderedNavigationTargets() { return [] }

  onRouteChange(callback: () => void) {
    window.addEventListener('popstate', callback)
    return () => window.removeEventListener('popstate', callback)
  }
}

export function findBrowserHistoryAdapter() {
  const routes = window.__UNPLUGIN_PAGEFLOW_ROUTES__
  return routes?.length ? new BrowserHistoryAdapter(routes) : undefined
}
