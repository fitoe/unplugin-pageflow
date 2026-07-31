import PageFlow from '../plugin/index'
import type { PageFlowOptions, PageFlowRuntimeRoute } from '../shared/types'

export interface ReactRouterRouteLike {
  id?: string
  path?: string
  index?: boolean
  file?: string
  title?: string
  children?: ReactRouterRouteLike[]
}

function joinRoutePath(parent: string, path?: string) {
  if (!path) return parent || '/'
  if (path.startsWith('/')) return path
  return `/${[parent, path].join('/').split('/').filter(Boolean).join('/')}`
}

export function resolveReactRouterRoutes(routeConfig: ReactRouterRouteLike[]) {
  const routes: PageFlowRuntimeRoute[] = []
  const visit = (entries: ReactRouterRouteLike[], parent = '') => entries.forEach((entry, index) => {
    const path = joinRoutePath(parent, entry.path)
    if (entry.index || entry.path) {
      const id = entry.id ?? entry.file ?? `${path}:${index}`
      routes.push({
        id,
        name: entry.id,
        path,
        title: entry.title ?? entry.id ?? (path === '/' ? 'index' : path.split('/').at(-1)!),
        componentFile: entry.file,
      })
    }
    if (entry.children?.length) visit(entry.children, path)
  })
  visit(routeConfig)
  return routes
}

export default function pageflowReactRouter(routeConfig: ReactRouterRouteLike[], options: PageFlowOptions = {}) {
  return PageFlow.vite({ ...options, framework: 'react-router', routes: resolveReactRouterRoutes(routeConfig) })
}
