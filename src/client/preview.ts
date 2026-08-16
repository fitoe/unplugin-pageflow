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

export function shouldInspectPreviewFrame(
  framePageId: string,
  focusedPageId?: string,
  liveFramePageId?: string,
  livePageId?: string,
) {
  // A navigation handoff updates the physical frame's live page before the
  // focus flight reaches its midpoint. Keep inspection enabled throughout the
  // flight so Vue does not rewrite the externally navigated iframe `src` back
  // to its original card route.
  if (framePageId === liveFramePageId && livePageId) return true
  return previewFrameDisplayPageId(framePageId, liveFramePageId, livePageId) === focusedPageId
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

export function syncPreviewHotspotLayerVisibility(layer: HTMLElement, visible: boolean) {
  // Link hotspots must navigate inside the live iframe so the router, query,
  // and rendered page stay authoritative. PageFlow synchronizes afterward.
  layer.style.display = visible ? 'block' : 'none'
}

export function navigatePreviewFrame(frame: HTMLIFrameElement, url: string, origin = window.location.origin) {
  const target = new URL(url, origin).href
  try {
    if (frame.contentWindow?.location.href === target) return false
  }
  catch {}
  frame.src = target
  return true
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
