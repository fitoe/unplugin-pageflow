import { readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import PageFlow from '../plugin/index'
import type { PageFlowOptions, PageFlowRuntimeRoute } from '../shared/types'

const ROUTE_FILE = /\.(?:[jt]sx?)$/

function solidSegment(segment: string) {
  if (/^\(.+\)$/.test(segment)) return ''
  const rest = segment.match(/^\[\.\.\.(.+)\]$/)?.[1]
  if (rest) return `:${rest}*`
  const dynamic = segment.match(/^\[(.+)\]$/)?.[1]
  return dynamic ? `:${dynamic}` : segment
}

export function resolveSolidStartRoutes(root: string) {
  const routesDirectory = resolve(root, 'src/routes')
  const routes: PageFlowRuntimeRoute[] = []
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = resolve(directory, entry.name)
      if (entry.isDirectory()) visit(file)
      else if (entry.isFile() && ROUTE_FILE.test(entry.name) && !entry.name.endsWith('.data.ts')) {
        const relativeFile = relative(routesDirectory, file).replace(ROUTE_FILE, '')
        const segments = relativeFile.split(sep).filter(Boolean).map(solidSegment).filter(segment => segment && segment !== 'index')
        const path = `/${segments.join('/')}`
        routes.push({ id: path || '/', path: path || '/', title: segments.at(-1) ?? 'index', componentFile: file.replaceAll('\\', '/') })
      }
    }
  }
  try { visit(routesDirectory) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  return routes.sort((a, b) => a.path.localeCompare(b.path))
}

export default function pageflowSolidStart(options: PageFlowOptions = {}) {
  const routes: PageFlowRuntimeRoute[] = []
  const replaceRoutes = (root: string) => routes.splice(0, routes.length, ...resolveSolidStartRoutes(root))
  return [
    {
      name: 'unplugin-pageflow-solid-start-routes',
      enforce: 'pre' as const,
      configResolved(config: { root: string }) { replaceRoutes(options.projectRoot ?? config.root) },
      transform(code: string, id: string) {
        if (!id.replaceAll('\\', '/').endsWith('/src/entry-client.tsx')) return
        return `import 'virtual:unplugin-pageflow/runtime';\n${code}`
      },
      handleHotUpdate(context: { file: string, server: { config: { root: string }, ws: { send(message: { type: string }): void } } }) {
        if (!/[\\/]src[\\/]routes[\\/].*\.[jt]sx?$/.test(context.file)) return
        replaceRoutes(options.projectRoot ?? context.server.config.root)
        context.server.ws.send({ type: 'full-reload' })
        return []
      },
    },
    PageFlow.vite({ ...options, framework: 'solid-start', routes }),
  ]
}
