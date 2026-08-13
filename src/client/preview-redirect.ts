import type { PageFlowRouteMode } from '../shared/types'

function previewLocation(url: string, routeMode: PageFlowRouteMode, origin: string) {
  const parsed = new URL(url, origin)
  if (routeMode === 'hash' && parsed.hash.startsWith('#/'))
    return parsed.hash.slice(1).split(/[?#]/, 1)[0]
  return parsed.pathname
}

export function detectUnexpectedPreviewRedirect(
  expectedUrl: string,
  actualUrl: string,
  routeMode: PageFlowRouteMode,
  origin = window.location.origin,
) {
  const expectedPath = previewLocation(expectedUrl, routeMode, origin)
  const actualPath = previewLocation(actualUrl, routeMode, origin)
  return expectedPath === actualPath ? undefined : { expectedPath, actualPath }
}
