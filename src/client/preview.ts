import type { PageFlowRouteMode, ResolvedPageFlowOptions } from '../shared/types'

export const PAGEFLOW_LIVE_PREVIEW_CACHE_LIMIT = 3

function previewRole(path: string, config: ResolvedPageFlowOptions) {
  return config.previewRoles?.find(({ match }) => match.endsWith('/**')
    ? path.startsWith(match.slice(0, -3))
    : path === match)?.role
}

export function touchPreviewCache(ids: string[], pageId: string, limit = PAGEFLOW_LIVE_PREVIEW_CACHE_LIMIT) {
  return [...ids.filter(id => id !== pageId), pageId].slice(-limit)
}

export function resolvePreviewUrl(
  path: string,
  config: ResolvedPageFlowOptions,
  origin = window.location.origin,
  routeMode: PageFlowRouteMode = 'history',
  navigationLocation?: string,
  user?: string,
) {
  const params = config.dynamicParams[path] ?? {}
  const resolvedPath = navigationLocation ?? path.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?[?+*]?/g, (_token, name: string, pattern?: string) => {
    const value = params[name] ?? (pattern?.includes('\\d') ? 1 : 'unplugin-pageflow')
    return encodeURIComponent(value)
  })
  const base = new URL(config.appUrl.endsWith('/') ? config.appUrl : `${config.appUrl}/`, origin)
  const role = user ?? previewRole(path, config)
  if (routeMode === 'hash') {
    base.searchParams.set('__unplugin-pageflow_preview', '1')
    if (role) base.searchParams.set('__unplugin-pageflow_role', role)
    base.hash = `#${resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`}`
    return `${base.pathname}${base.search}${base.hash}`
  }
  const url = new URL(resolvedPath.replace(/^\//, ''), base)
  url.searchParams.set('__unplugin-pageflow_preview', '1')
  if (role) url.searchParams.set('__unplugin-pageflow_role', role)
  return `${url.pathname}${url.search}`
}
