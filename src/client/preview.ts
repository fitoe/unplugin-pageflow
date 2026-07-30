import type { PageFlowRouteMode, ResolvedPageFlowOptions } from '../shared/types'

export const PAGEFLOW_LIVE_PREVIEW_CACHE_LIMIT = 20

export function touchPreviewCache(ids: string[], pageId: string, limit = PAGEFLOW_LIVE_PREVIEW_CACHE_LIMIT) {
  return [...ids.filter(id => id !== pageId), pageId].slice(-limit)
}

export function resolvePreviewUrl(
  path: string,
  config: ResolvedPageFlowOptions,
  origin = window.location.origin,
  routeMode: PageFlowRouteMode = 'history',
) {
  const params = config.dynamicParams[path] ?? {}
  const resolvedPath = path.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?[?+*]?/g, (_token, name: string, pattern?: string) => {
    const value = params[name] ?? (pattern?.includes('\\d') ? 1 : 'unplugin-pageflow')
    return encodeURIComponent(value)
  })
  const base = new URL(config.appUrl.endsWith('/') ? config.appUrl : `${config.appUrl}/`, origin)
  if (routeMode === 'hash') {
    base.searchParams.set('__unplugin-pageflow_preview', '1')
    base.hash = `#${resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`}`
    return `${base.pathname}${base.search}${base.hash}`
  }
  const url = new URL(resolvedPath.replace(/^\//, ''), base)
  url.searchParams.set('__unplugin-pageflow_preview', '1')
  return `${url.pathname}${url.search}`
}
