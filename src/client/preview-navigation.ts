import type { PageFlowRouteMode } from '../shared/types'

export interface PendingPreviewNavigation {
  id: number
  framePageId: string
  sourcePageId: string
  sourcePath: string
  targetPageId: string
  targetPath: string
  location: string
  expectedUrl: string
  reason: string
  startedAt: number
}

export type PreviewNavigationObservation =
  | { status: 'stale', path: string, location: string }
  | { status: 'confirmed', path: string, location: string }
  | { status: 'redirected', path: string, location: string }

function routePath(location: string) {
  return location.split(/[?#]/, 1)[0] || '/'
}

export function previewRouteLocation(url: string, routeMode: PageFlowRouteMode, origin = window.location.origin) {
  const parsed = new URL(url, origin)
  if (routeMode === 'hash' && parsed.hash.startsWith('#/')) return parsed.hash.slice(1)
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function createPendingPreviewNavigation(input: Omit<PendingPreviewNavigation, 'id' | 'sourcePath' | 'targetPath' | 'startedAt'> & {
  id?: number
  sourcePath: string
  targetPath: string
  startedAt?: number
}): PendingPreviewNavigation {
  return {
    ...input,
    id: input.id ?? Date.now(),
    sourcePath: routePath(input.sourcePath),
    targetPath: routePath(input.targetPath),
    startedAt: input.startedAt ?? Date.now(),
  }
}

export function observePreviewNavigation(
  navigation: PendingPreviewNavigation,
  observedLocation: string,
  settled = false,
): PreviewNavigationObservation {
  const path = routePath(observedLocation)
  if (path === navigation.targetPath) return { status: 'confirmed', path, location: observedLocation }
  if (!settled && path === navigation.sourcePath && navigation.sourcePath !== navigation.targetPath)
    return { status: 'stale', path, location: observedLocation }
  return { status: 'redirected', path, location: observedLocation }
}
