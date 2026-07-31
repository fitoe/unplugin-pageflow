import { readdirSync } from 'node:fs'
import { createServer as createHttpServer, type Server, type ServerResponse } from 'node:http'
import { relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import next from 'next'
import { createServer as createViteServer, type ViteDevServer } from 'vite'
import PageFlow from '../plugin/index'
import type { PageFlowOptions, PageFlowRuntimeRoute } from '../shared/types'

const PAGE_FILE = /\.(?:[jt]sx?)$/

function nextSegment(segment: string) {
  if (/^\(.+\)$/.test(segment) || segment.startsWith('@')) return ''
  const optionalRest = segment.match(/^\[\[\.\.\.(.+)\]\]$/)?.[1]
  if (optionalRest) return `:${optionalRest}*`
  const rest = segment.match(/^\[\.\.\.(.+)\]$/)?.[1]
  if (rest) return `:${rest}*`
  const dynamic = segment.match(/^\[(.+)\]$/)?.[1]
  return dynamic ? `:${dynamic}` : segment.replace(/^\(\.\.\.?\)|^\(\.\)/, '')
}

function addRoutes(routes: PageFlowRuntimeRoute[], root: string, directory: 'app' | 'pages') {
  const base = resolve(root, directory)
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const file = resolve(current, entry.name)
      if (entry.isDirectory()) {
        if (directory === 'pages' && entry.name === 'api') continue
        visit(file)
      } else if (entry.isFile() && PAGE_FILE.test(entry.name)) {
        const withoutExtension = relative(base, file).replace(PAGE_FILE, '')
        const parts = withoutExtension.split(sep)
        if (directory === 'app' && parts.at(-1) !== 'page') continue
        if (directory === 'pages' && /^_(?:app|document|error)$/.test(parts.at(-1)!)) continue
        if (directory === 'app') parts.pop()
        else if (parts.at(-1) === 'index') parts.pop()
        const segments = parts.map(nextSegment).filter(Boolean)
        const path = `/${segments.join('/')}`
        routes.push({ id: path || '/', path: path || '/', title: segments.at(-1) ?? 'index', componentFile: file.replaceAll('\\', '/') })
      }
    }
  }
  try { visit(base) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
}

export function resolveNextRoutes(root: string) {
  const routes: PageFlowRuntimeRoute[] = []
  for (const sourceRoot of [root, resolve(root, 'src')]) {
    addRoutes(routes, sourceRoot, 'app')
    addRoutes(routes, sourceRoot, 'pages')
  }
  const unique = new Map(routes.map(route => [route.path, route]))
  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path))
}

function injectRuntime(response: ServerResponse, runtimePath: string) {
  const chunks: Buffer[] = []
  const toBuffer = (chunk: unknown, encoding?: BufferEncoding) => {
    if (Buffer.isBuffer(chunk)) return chunk
    if (ArrayBuffer.isView(chunk)) return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    return Buffer.from(String(chunk), encoding)
  }
  const write = response.write.bind(response)
  const end = response.end.bind(response)
  response.write = ((chunk: unknown, encoding?: BufferEncoding) => {
    if (chunk != null) chunks.push(toBuffer(chunk, encoding))
    return true
  }) as typeof response.write
  response.end = ((chunk?: unknown, encoding?: BufferEncoding, callback?: () => void) => {
    if (chunk != null) chunks.push(toBuffer(chunk, encoding))
    let body = Buffer.concat(chunks)
    if (String(response.getHeader('content-type') ?? '').includes('text/html')) {
      const html = body.toString('utf8')
      const script = `<script type="module">import '${runtimePath}'</script>`
      body = Buffer.from(html.includes('</head>') ? html.replace('</head>', `${script}</head>`) : `${script}${html}`)
      response.setHeader('content-length', String(body.byteLength))
    }
    write(body)
    return end(callback)
  }) as typeof response.end
}

export interface PageFlowNextDevOptions extends PageFlowOptions {
  dir?: string
  hostname?: string
  port?: number
}

export interface PageFlowNextDevServer {
  server: Server
  vite: ViteDevServer
  close(): Promise<void>
}

export async function createPageFlowNextDevServer(options: PageFlowNextDevOptions = {}): Promise<PageFlowNextDevServer> {
  const dir = resolve(options.dir ?? process.cwd())
  const hostname = options.hostname ?? '127.0.0.1'
  const port = options.port ?? 3000
  const routes = resolveNextRoutes(dir)
  const pageflow = PageFlow.vite({ ...options, framework: 'next', projectRoot: dir, routes })
  const vite = await createViteServer({
    root: dir,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
    plugins: [pageflow],
  })
  const app = next({ dev: true, dir, hostname, port, turbopack: true })
  await app.prepare()
  const handle = app.getRequestHandler()
  const runtimePath = '/@id/virtual:unplugin-pageflow/runtime'
  const previewPath = `/${(options.previewPath ?? '__unplugin-pageflow').replace(/^\/+|\/+$/g, '')}/`
  const server = createHttpServer((request, response) => {
    const pathname = new URL(request.url ?? '/', `http://${hostname}:${port}`).pathname
    if (pathname.startsWith(previewPath) || pathname.startsWith('/@id/') || pathname.startsWith('/@fs/')) {
      vite.middlewares(request, response, (error: unknown) => {
        if (error) response.destroy(error instanceof Error ? error : new Error(String(error)))
        else { response.statusCode = 404; response.end() }
      })
      return
    }
    request.headers['accept-encoding'] = 'identity'
    injectRuntime(response, runtimePath)
    void handle(request, response)
  })
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(port, hostname, () => resolveListen())
  })
  return {
    server,
    vite,
    async close() {
      await new Promise<void>((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()))
      await app.close()
      await vite.close()
    },
  }
}

async function runCli() {
  const args = process.argv.slice(2)
  const value = (name: string) => args[args.indexOf(name) + 1]
  const server = await createPageFlowNextDevServer({
    dir: value('--dir'),
    hostname: value('--host'),
    port: value('--port') ? Number(value('--port')) : undefined,
  })
  const close = () => void server.close().finally(() => process.exit())
  process.once('SIGINT', close)
  process.once('SIGTERM', close)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void runCli()
