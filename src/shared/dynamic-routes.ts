import type { PageFlowDynamicParamValues, PageFlowRuntimeRoute } from './types.ts'

export function resolveDynamicRoutePath(path: string, params: PageFlowDynamicParamValues) {
  return path.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?[?+*]?/g, (_token, name: string) =>
    encodeURIComponent(params[name] ?? 'unplugin-pageflow'))
}

export function expandDynamicRoutes(
  routes: PageFlowRuntimeRoute[],
  dynamicParams: Record<string, PageFlowDynamicParamValues | PageFlowDynamicParamValues[]>,
) {
  return routes.flatMap((route) => {
    const variants = dynamicParams[route.path]
    if (!Array.isArray(variants) || !variants.length) return [route]
    return variants.map((params) => {
      const path = resolveDynamicRoutePath(route.path, params)
      return {
        ...route,
        id: `${route.id}::${path}`,
        path,
        title: typeof params.$title === 'string' ? params.$title : route.title,
      }
    })
  })
}
