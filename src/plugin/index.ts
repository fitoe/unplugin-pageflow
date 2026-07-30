import { createUnplugin } from 'unplugin'
import type { UnpluginFactory } from 'unplugin'
import type {
  PageFlowGraph,
  PageFlowOptions,
  PageFlowPage,
  PageFlowRuntimeLink,
  PageFlowRuntimePage,
  PageFlowRuntimeRoute,
  ResolvedPageFlowOptions,
} from '../shared/types.ts'
import { PAGEFLOW_GRAPH_EVENT } from '../shared/protocol.ts'
import {
  PAGEFLOW_CLIENT_ID,
  PAGEFLOW_CLIENT_RESOLVED_ID,
  PAGEFLOW_CONFIG_ID,
  PAGEFLOW_CONFIG_RESOLVED_ID,
  PAGEFLOW_RUNTIME_ID,
  PAGEFLOW_RUNTIME_RESOLVED_ID,
} from './constants.ts'

const ACCENTS = ['#ff795d', '#7c6cff', '#26b99a', '#e7ad43', '#dd648e']

function normalizePreviewPath(path: string) {
  return `/${path.replace(/^\/+|\/+$/g, '')}/`
}

function resolveOptions(options: PageFlowOptions = {}): ResolvedPageFlowOptions {
  return {
    enabled: options.enabled ?? true,
    previewPath: normalizePreviewPath(options.previewPath ?? '/__unplugin-pageflow/'),
    appUrl: options.appUrl ?? '/',
    dynamicParams: options.dynamicParams ?? {},
  }
}

function createGraph(
  routes: PageFlowRuntimeRoute[],
  reportedLinks: Map<string, PageFlowRuntimePage['links']>,
  staticLinksByFile: Map<string, PageFlowRuntimeLink[]>,
  version: number,
): PageFlowGraph {
  const seen = new Set<string>()
  const pages: PageFlowPage[] = routes
    .filter(route => route.path && !seen.has(route.id) && seen.add(route.id))
    .map((route, index) => ({
      id: route.id,
      title: route.title,
      path: route.path,
      accent: ACCENTS[index % ACCENTS.length],
      links: [],
    }))
  const idsByPath = new Map(pages.map(page => [page.path, page.id]))
  const routesById = new Map(routes.map(route => [route.id, route]))

  const resolveTarget = (path: string) => {
    const exact = idsByPath.get(path)
    if (exact) return exact
    const targetSegments = path.split('/')
    return pages.find(page => {
      const routeSegments = page.path.split('/')
      return routeSegments.length === targetSegments.length
        && routeSegments.every((segment, index) => segment.startsWith(':') || segment === targetSegments[index])
    })?.id
  }

  pages.forEach(page => {
    const componentFile = routesById.get(page.id)?.componentFile
    const staticLinks = componentFile
      ? [...staticLinksByFile.entries()].find(([file]) => file === componentFile || file.endsWith(componentFile))?.[1] ?? []
      : []
    const links = new Map<string, PageFlowPage['links'][number]>()
    ;[...staticLinks, ...(reportedLinks.get(page.path) ?? [])].forEach(link => {
      const target = resolveTarget(link.to)
      if (target) links.set(target, { label: link.label, to: target })
    })
    page.links = [...links.values()]
  })

  return { pages, version }
}

function normalizeFile(id: string) {
  return id.split('?')[0].replaceAll('\\', '/')
}

function toViteFsPath(url: URL) {
  const pathname = decodeURIComponent(url.pathname)
    .replace(/^\/([A-Za-z]:\/)/, '$1')
    .replaceAll('\\', '/')
  return `/@fs/${pathname}`
}

function extractStaticLinks(code: string) {
  const links: PageFlowRuntimeLink[] = []
  const routerNames = new Set(['router', '$router'])
  for (const match of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*useRouter\s*\(\s*\)/g))
    routerNames.add(match[1])
  const callers = [...routerNames]
    .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const routerCall = `(?:(?<![\\w$])(?:${callers})(?![\\w$])|useRouter\\(\\s*\\))`
  const calls = new RegExp(`${routerCall}\\s*\\.\\s*(push|replace)\\s*\\(\\s*(["'\\\`])([^"'\\\`]+)\\2`, 'g')
  const objectCalls = new RegExp(`${routerCall}\\s*\\.\\s*(push|replace)\\s*\\(\\s*\\{\\s*path\\s*:\\s*(["'])\\s*([^"']+)\\2`, 'g')
  for (const pattern of [calls, objectCalls]) {
    for (const match of code.matchAll(pattern)) {
      const target = match[3]
      if (!target.startsWith('/') || target.includes('${')) continue
      links.push({ label: `${match[1]} ${target}`, to: target })
    }
  }
  return links
}

async function readJson(request: AsyncIterable<Uint8Array | string>) {
  let body = ''
  for await (const chunk of request) {
    body += chunk.toString()
    if (body.length > 1_000_000) throw new Error('Request body is too large')
  }

  return JSON.parse(body) as Record<string, unknown>
}

async function readRoutes(request: AsyncIterable<Uint8Array | string>) {
  const value = await readJson(request)
  if (!Array.isArray(value.routes)) throw new Error('routes must be an array')

  return value.routes.filter((route): route is PageFlowRuntimeRoute => {
    if (!route || typeof route !== 'object') return false
    const candidate = route as Partial<PageFlowRuntimeRoute>
    return typeof candidate.id === 'string'
      && typeof candidate.path === 'string'
      && typeof candidate.title === 'string'
  })
}

async function readPage(request: AsyncIterable<Uint8Array | string>): Promise<PageFlowRuntimePage> {
  const value = await readJson(request)
  if (typeof value.path !== 'string' || !Array.isArray(value.links))
    throw new Error('path and links are required')

  const links = value.links.filter((link): link is PageFlowRuntimePage['links'][number] => {
    if (!link || typeof link !== 'object') return false
    const candidate = link as Partial<PageFlowRuntimePage['links'][number]>
    return typeof candidate.label === 'string' && typeof candidate.to === 'string'
  })
  return { path: value.path, links }
}

function pageflowHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>unplugin-pageflow</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">import '${PAGEFLOW_CLIENT_ID}'</script>
  </body>
</html>`
}

const factory: UnpluginFactory<PageFlowOptions | undefined> = (options) => {
  const resolved = resolveOptions(options)
  const packaged = !import.meta.url.includes('/src/plugin/')
  const clientEntry = toViteFsPath(new URL(packaged ? '../client/mount.js' : '../client/mount.ts', import.meta.url))
  const runtimeEntry = toViteFsPath(new URL(packaged ? '../runtime/client.js' : '../runtime/client.ts', import.meta.url))
  const clientStyle = packaged ? toViteFsPath(new URL('../style.css', import.meta.url)) : undefined
  let graph: PageFlowGraph = { pages: [], version: 0 }
  let routes: PageFlowRuntimeRoute[] = []
  const reportedLinks = new Map<string, PageFlowRuntimePage['links']>()
  const staticLinksByFile = new Map<string, PageFlowRuntimeLink[]>()
  let sendGraphUpdate: ((graph: PageFlowGraph) => void) | undefined

  const rebuildGraph = () => {
    graph = createGraph(routes, reportedLinks, staticLinksByFile, graph.version + 1)
    sendGraphUpdate?.(graph)
  }

  return {
    name: 'unplugin-pageflow',
    enforce: 'pre',
    resolveId(id) {
      if (id === PAGEFLOW_CONFIG_ID) return PAGEFLOW_CONFIG_RESOLVED_ID
      if (id === PAGEFLOW_CLIENT_ID) return PAGEFLOW_CLIENT_RESOLVED_ID
      if (id === PAGEFLOW_RUNTIME_ID) return PAGEFLOW_RUNTIME_RESOLVED_ID
    },
    load(id) {
      if (id === PAGEFLOW_CONFIG_RESOLVED_ID)
        return `export default ${JSON.stringify(resolved)}`
      if (id === PAGEFLOW_CLIENT_RESOLVED_ID)
        return `${clientStyle ? `import '${clientStyle}';` : ''} import config from '${PAGEFLOW_CONFIG_ID}'; import { mountPageFlow } from '${clientEntry}'; mountPageFlow(document.querySelector('#app'), config)`
      if (id === PAGEFLOW_RUNTIME_RESOLVED_ID)
        return `import config from '${PAGEFLOW_CONFIG_ID}'; import { startPageFlowRuntime } from '${runtimeEntry}'; startPageFlowRuntime(config)`
    },
    transform(code, id) {
      if (!id.includes('.vue')) return
      const file = normalizeFile(id)
      const nextLinks = extractStaticLinks(code)
      const currentLinks = staticLinksByFile.get(file) ?? []
      if (JSON.stringify(currentLinks) === JSON.stringify(nextLinks)) return
      if (nextLinks.length) staticLinksByFile.set(file, nextLinks)
      else staticLinksByFile.delete(file)
      if (routes.length) rebuildGraph()
    },
    vite: {
      apply: 'serve',
      transformIndexHtml: {
        order: 'pre',
        handler(_html, context) {
          if (!resolved.enabled || context.path.startsWith(resolved.previewPath)) return
          return [{
            tag: 'script',
            attrs: { type: 'module' },
            children: `import '${PAGEFLOW_RUNTIME_ID}'`,
            injectTo: 'body',
          }]
        },
      },
      configureServer(server) {
        if (!resolved.enabled) return
        sendGraphUpdate = nextGraph => server.ws.send({ type: 'custom', event: PAGEFLOW_GRAPH_EVENT, data: nextGraph })

        server.middlewares.use(async (request, response, next) => {
          const pathname = request.url?.split('?')[0]
          const graphPath = `${resolved.previewPath}api/graph`
          const routesPath = `${resolved.previewPath}api/routes`
          const pagePath = `${resolved.previewPath}api/page`

          if (pathname === graphPath && request.method === 'GET') {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify(graph))
            return
          }

          if (pathname === routesPath && request.method === 'POST') {
            try {
              const nextRoutes = await readRoutes(request)
              if (JSON.stringify(nextRoutes) !== JSON.stringify(routes)) {
                routes = nextRoutes
                rebuildGraph()
              }
              response.statusCode = 204
              response.end()
            } catch (error) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }))
            }
            return
          }

          if (pathname === pagePath && request.method === 'POST') {
            try {
              const page = await readPage(request)
              const currentLinks = reportedLinks.get(page.path)
              if (JSON.stringify(currentLinks) !== JSON.stringify(page.links)) {
                reportedLinks.set(page.path, page.links)
                rebuildGraph()
              }
              response.statusCode = 204
              response.end()
            } catch (error) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }))
            }
            return
          }

          if (pathname !== resolved.previewPath && pathname !== `${resolved.previewPath}index.html`)
            return next()

          const html = await server.transformIndexHtml(resolved.previewPath, pageflowHtml())
          response.statusCode = 200
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          response.end(html)
        })

        server.httpServer?.once('listening', () => {
          const address = server.httpServer?.address()
          const port = typeof address === 'object' && address ? address.port : server.config.server.port
          const configuredHost = server.config.server.host
          const host = typeof configuredHost === 'string' && configuredHost !== '0.0.0.0'
            ? configuredHost
            : 'localhost'
          const protocol = server.config.server.https ? 'https' : 'http'
          server.config.logger.info(`  unplugin-pageflow  ${protocol}://${host}:${port}${resolved.previewPath}`)
        })
      },
    },
  }
}

export type { PageFlowOptions } from '../shared/types.ts'
export default createUnplugin(factory)
