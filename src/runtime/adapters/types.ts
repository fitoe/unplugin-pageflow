import type { PageFlowRuntimeRoute, PageFlowRouteMode } from '../../shared/types'

export interface PageFlowResolvedNavigation {
  path: string
  location: string
}

export interface PageFlowRouterAdapter {
  readonly name: string
  routes(): PageFlowRuntimeRoute[]
  routeMode(): PageFlowRouteMode
  currentPath(): string
  resolve(to: unknown): PageFlowResolvedNavigation | undefined
  resolveAnchor(target: URL): PageFlowResolvedNavigation
  interceptNavigation(callback: (navigation: PageFlowResolvedNavigation, method: string) => void): void
  renderedNavigationTargets?(element: Element): string[]
  onRouteChange(callback: () => void): (() => void) | undefined
}
