import { readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import PageFlow from '../plugin/index'
import type { PageFlowOptions, PageFlowRuntimeRoute } from '../shared/types'

const PAGE_FILE = /^index(?:@[^.]+)?\.(?:tsx|jsx|mdx)$/

function qwikSegment(segment: string) {
  const rest = segment.match(/^\[\.\.\.(.+)\]$/)?.[1]
  if (rest) return `:${rest}*`
  const dynamic = segment.match(/^\[(.+)\]$/)?.[1]
  return dynamic ? `:${dynamic}` : segment
}

export function resolveQwikCityRoutes(root: string) {
  const routesDirectory = resolve(root, 'src/routes')
  const routes: PageFlowRuntimeRoute[] = []
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = resolve(directory, entry.name)
      if (entry.isDirectory()) visit(file)
      else if (entry.isFile() && PAGE_FILE.test(entry.name)) {
        const segments = relative(routesDirectory, directory).split(sep).filter(Boolean).map(qwikSegment)
        const path = `/${segments.join('/')}`
        routes.push({ id: path || '/', path: path || '/', title: segments.at(-1) ?? 'index', componentFile: file.replaceAll('\\', '/') })
      }
    }
  }
  try { visit(routesDirectory) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  return routes.sort((a, b) => a.path.localeCompare(b.path))
}

export default function pageflowQwikCity(options: PageFlowOptions = {}) {
  const routes: PageFlowRuntimeRoute[] = []
  const replaceRoutes = (root: string) => routes.splice(0, routes.length, ...resolveQwikCityRoutes(root))
  return [
    {
      name: 'unplugin-pageflow-qwik-city-routes',
      enforce: 'pre' as const,
      apply: 'serve' as const,
      configResolved(config: { root: string }) { replaceRoutes(options.projectRoot ?? config.root) },
      transform(code: string, id: string) {
        const normalized = id.replaceAll('\\', '/').split('?')[0]
        if (!normalized.endsWith('/src/entry.dev.tsx') && !normalized.endsWith('/src/root.tsx')) return
        if (code.includes('virtual:unplugin-pageflow/runtime')) return
        return `import 'virtual:unplugin-pageflow/runtime';\n${code}`
      },
      handleHotUpdate(context: { file: string, server: { config: { root: string }, ws: { send(message: { type: string }): void } } }) {
        if (!/[\\/]src[\\/]routes[\\/].*[\\/]index(?:@[^.]+)?\.(?:tsx|jsx|mdx)$/.test(context.file)) return
        replaceRoutes(options.projectRoot ?? context.server.config.root)
        context.server.ws.send({ type: 'full-reload' })
        return []
      },
    },
    PageFlow.vite({ ...options, framework: 'qwik-city', routes }),
  ]
}
