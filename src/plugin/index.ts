import { createUnplugin } from 'unplugin'
import type { UnpluginFactory } from 'unplugin'
import { createHash } from 'node:crypto'
import type { ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type {
  PageFlowGraph,
  PageFlowOptions,
  PageFlowPage,
  PageFlowRuntimeLink,
  PageFlowRuntimePage,
  PageFlowRuntimeRoute,
  PageFlowRouteMode,
  ResolvedPageFlowOptions,
} from '../shared/types.ts'
import { PAGEFLOW_GRAPH_EVENT, PAGEFLOW_PAGE_EVENT } from '../shared/protocol.ts'
import {
  PAGEFLOW_CLIENT_ID,
  PAGEFLOW_CLIENT_RESOLVED_ID,
  PAGEFLOW_CONFIG_ID,
  PAGEFLOW_CONFIG_RESOLVED_ID,
  PAGEFLOW_RUNTIME_ID,
  PAGEFLOW_RUNTIME_RESOLVED_ID,
} from './constants.ts'
import { createThumbnailCache } from './thumbnail-cache.ts'

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
  sourceRevisionsByFile: Map<string, string>,
  version: number,
  routeMode: PageFlowRouteMode,
): PageFlowGraph {
  const seen = new Set<string>()
  const pages: PageFlowPage[] = routes
    .filter(route => route.path && !seen.has(route.id) && seen.add(route.id))
    .map((route, index) => ({
      id: route.id,
      title: route.title,
      path: route.path,
      revision: route.componentFile
        ? [...sourceRevisionsByFile.entries()].find(([file]) => file === route.componentFile || file.endsWith(route.componentFile!))?.[1] ?? route.path
        : route.path,
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

  return { pages, routeMode, version }
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

async function readBinary(request: AsyncIterable<Uint8Array | string>, maximumBytes = 16_000_000) {
  const chunks: Uint8Array[] = []
  let length = 0
  for await (const chunk of request) {
    const data = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    length += data.byteLength
    if (length > maximumBytes) throw new Error('Thumbnail is too large')
    chunks.push(data)
  }
  return Buffer.concat(chunks)
}

async function readRoutes(request: AsyncIterable<Uint8Array | string>) {
  const value = await readJson(request)
  if (!Array.isArray(value.routes)) throw new Error('routes must be an array')

  const routes = value.routes.filter((route): route is PageFlowRuntimeRoute => {
    if (!route || typeof route !== 'object') return false
    const candidate = route as Partial<PageFlowRuntimeRoute>
    return typeof candidate.id === 'string'
      && typeof candidate.path === 'string'
      && typeof candidate.title === 'string'
  })
  const routeMode: PageFlowRouteMode = value.routeMode === 'hash' ? 'hash' : 'history'
  return { routeMode, routes }
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
  let graph: PageFlowGraph = { pages: [], routeMode: 'history', version: 0 }
  let routes: PageFlowRuntimeRoute[] = []
  let routeMode: PageFlowRouteMode = 'history'
  const reportedLinks = new Map<string, PageFlowRuntimePage['links']>()
  const staticLinksByFile = new Map<string, PageFlowRuntimeLink[]>()
  const sourceRevisionsByFile = new Map<string, string>()
  const eventResponses = new Set<ServerResponse>()
  let sendGraphUpdate: ((graph: PageFlowGraph) => void) | undefined
  let sendPageUpdate: ((page: PageFlowPage) => void) | undefined

  const rebuildGraph = (updatedPath?: string) => {
    graph = createGraph(routes, reportedLinks, staticLinksByFile, sourceRevisionsByFile, graph.version + 1, routeMode)
    if (updatedPath) {
      const page = graph.pages.find(item => item.path === updatedPath)
      if (page) sendPageUpdate?.(page)
    } else sendGraphUpdate?.(graph)
  }

  const sendEvent = (event: string, data: unknown) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    eventResponses.forEach(response => response.write(message))
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
      const nextRevision = createHash('sha256').update(code).digest('hex').slice(0, 16)
      const linksChanged = JSON.stringify(currentLinks) !== JSON.stringify(nextLinks)
      const revisionChanged = sourceRevisionsByFile.get(file) !== nextRevision
      if (!linksChanged && !revisionChanged) return
      if (nextLinks.length) staticLinksByFile.set(file, nextLinks)
      else staticLinksByFile.delete(file)
      sourceRevisionsByFile.set(file, nextRevision)
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
        const thumbnailCache = createThumbnailCache(resolve(server.config.root, '.unplugin-pageflow/cache'))
        sendGraphUpdate = nextGraph => {
          server.ws.send({ type: 'custom', event: PAGEFLOW_GRAPH_EVENT, data: nextGraph })
          sendEvent(PAGEFLOW_GRAPH_EVENT, nextGraph)
        }
        sendPageUpdate = page => {
          server.ws.send({ type: 'custom', event: PAGEFLOW_PAGE_EVENT, data: page })
          sendEvent(PAGEFLOW_PAGE_EVENT, page)
        }

        server.middlewares.use(async (request, response, next) => {
          const requestUrl = new URL(request.url ?? '/', 'http://unplugin-pageflow.local')
          const pathname = requestUrl.pathname
          const graphPath = `${resolved.previewPath}api/graph`
          const eventsPath = `${resolved.previewPath}api/events`
          const routesPath = `${resolved.previewPath}api/routes`
          const pagePath = `${resolved.previewPath}api/page`
          const thumbnailsPath = `${resolved.previewPath}api/thumbnails`
          const thumbnailPath = `${resolved.previewPath}api/thumbnail`

          if (pathname === eventsPath && request.method === 'GET') {
            response.statusCode = 200
            response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
            response.setHeader('Cache-Control', 'no-cache, no-transform')
            response.setHeader('Connection', 'keep-alive')
            response.write(': connected\n\n')
            eventResponses.add(response)
            request.on('close', () => eventResponses.delete(response))
            return
          }

          if (pathname === graphPath && request.method === 'GET') {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify(graph))
            return
          }

          if (pathname === thumbnailsPath && request.method === 'GET') {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify(await thumbnailCache.manifest()))
            return
          }

          if (pathname === thumbnailPath && request.method === 'GET') {
            const slot = requestUrl.searchParams.get('slot')
            const cached = slot ? await thumbnailCache.read(slot) : undefined
            if (!cached) {
              response.statusCode = 404
              response.end()
              return
            }
            response.setHeader('Content-Type', cached.record.mimeType)
            response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            response.end(cached.data)
            return
          }

          if (pathname === thumbnailPath && request.method === 'POST') {
            try {
              const slot = requestUrl.searchParams.get('slot')
              const revision = requestUrl.searchParams.get('revision')
              const width = Number(requestUrl.searchParams.get('width'))
              const height = Number(requestUrl.searchParams.get('height'))
              const optionalNumber = (name: string) => {
                const value = requestUrl.searchParams.get(name)
                return value == null ? undefined : Number(value)
              }
              const pageHeight = optionalNumber('pageHeight')
              const tileCount = optionalNumber('tileCount')
              const tileIndex = optionalNumber('tileIndex')
              const tileTop = optionalNumber('tileTop')
              const mimeType = request.headers['content-type']?.split(';')[0]
              if (!slot || slot.length > 500 || !revision || revision.length > 200)
                throw new Error('slot and revision are required')
              if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0)
                throw new Error('width and height must be positive numbers')
              if ([pageHeight, tileCount, tileIndex, tileTop].some(value => value != null && (!Number.isFinite(value) || value < 0)))
                throw new Error('Invalid thumbnail tile metadata')
              if (!mimeType || !['image/webp', 'image/jpeg', 'image/png'].includes(mimeType))
                throw new Error('Unsupported thumbnail format')
              const record = await thumbnailCache.write(
                slot,
                revision,
                width,
                height,
                mimeType,
                await readBinary(request),
                { pageHeight, tileCount, tileIndex, tileTop },
              )
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify(record))
            } catch (error) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid thumbnail' }))
            }
            return
          }

          if (pathname === routesPath && request.method === 'POST') {
            try {
              const next = await readRoutes(request)
              if (next.routeMode !== routeMode || JSON.stringify(next.routes) !== JSON.stringify(routes)) {
                routeMode = next.routeMode
                routes = next.routes
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
                rebuildGraph(page.path)
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
        server.httpServer?.once('close', () => {
          eventResponses.forEach(response => response.end())
          eventResponses.clear()
        })
      },
    },
  }
}

export type { PageFlowOptions } from '../shared/types.ts'
export default createUnplugin(factory)
