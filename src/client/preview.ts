import type { PageFlowRouteMode, ResolvedPageFlowOptions } from '../shared/types'
import { PAGEFLOW_PREVIEW_PARAM, PAGEFLOW_ROLE_PARAM } from '../shared/protocol.ts'

export const PAGEFLOW_LIVE_PREVIEW_CACHE_LIMIT = 3

export function previewRole(path: string, config: ResolvedPageFlowOptions) {
  return config.previewRoles?.find(({ match }) => match.endsWith('/**')
    ? path.startsWith(match.slice(0, -3))
    : path === match)?.role
}

export function touchPreviewCache(ids: string[], pageId: string, limit = PAGEFLOW_LIVE_PREVIEW_CACHE_LIMIT) {
  return [...ids.filter(id => id !== pageId), pageId].slice(-limit)
}

export function previewFrameDisplayPageId(framePageId: string, liveFramePageId?: string, livePageId?: string) {
  return framePageId === liveFramePageId ? livePageId ?? framePageId : framePageId
}

export function shouldMountPreviewFrame(
  framePageId: string,
  options: {
    focusedPageId?: string
    liveFramePageId?: string
    livePageId?: string
    capturePageId?: string
    cachedPageIds: string[]
  },
) {
  if (options.focusedPageId) {
    const handedOff = options.liveFramePageId
      && options.livePageId
      && options.liveFramePageId !== options.livePageId
    if (handedOff) {
      if (framePageId === options.liveFramePageId) return true
      if (framePageId === options.livePageId) return false
    }
    return previewFrameDisplayPageId(framePageId, options.liveFramePageId, options.livePageId) === options.focusedPageId
  }
  return framePageId === options.capturePageId || options.cachedPageIds.includes(framePageId)
}

export function resolvePreviewUrl(
  path: string,
  config: ResolvedPageFlowOptions,
  origin = window.location.origin,
  routeMode: PageFlowRouteMode = 'history',
  navigationLocation?: string,
  user?: string,
) {
  const configuredParams = config.dynamicParams[path]
  const params = Array.isArray(configuredParams) ? configuredParams[0] ?? {} : configuredParams ?? {}
  const resolvedPath = navigationLocation ?? path.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?[?+*]?/g, (_token, name: string, pattern?: string) => {
    const value = params[name] ?? (pattern?.includes('\\d') ? 1 : 'unplugin-pageflow')
    return encodeURIComponent(value)
  })
  const base = new URL(config.appUrl.endsWith('/') ? config.appUrl : `${config.appUrl}/`, origin)
  const role = user ?? previewRole(path, config)
  if (routeMode === 'hash') {
    base.searchParams.set(PAGEFLOW_PREVIEW_PARAM, '1')
    if (role) base.searchParams.set(PAGEFLOW_ROLE_PARAM, role)
    base.hash = `#${resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`}`
    return `${base.pathname}${base.search}${base.hash}`
  }
  const url = new URL(resolvedPath.replace(/^\//, ''), base)
  url.searchParams.set(PAGEFLOW_PREVIEW_PARAM, '1')
  if (role) url.searchParams.set(PAGEFLOW_ROLE_PARAM, role)
  return `${url.pathname}${url.search}`
}
