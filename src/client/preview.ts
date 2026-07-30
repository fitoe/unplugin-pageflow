import type { ResolvedPageFlowOptions } from '../shared/types'

export function resolvePreviewUrl(path: string, config: ResolvedPageFlowOptions, origin = window.location.origin) {
  const params = config.dynamicParams[path] ?? {}
  const resolvedPath = path.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?[?+*]?/g, (_token, name: string, pattern?: string) => {
    const value = params[name] ?? (pattern?.includes('\\d') ? 1 : 'unplugin-pageflow')
    return encodeURIComponent(value)
  })
  const base = new URL(config.appUrl.endsWith('/') ? config.appUrl : `${config.appUrl}/`, origin)
  const url = new URL(resolvedPath.replace(/^\//, ''), base)
  url.searchParams.set('__unplugin-pageflow_preview', '1')
  return `${url.pathname}${url.search}`
}
