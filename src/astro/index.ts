import type { AstroIntegration } from 'astro'
import { fileURLToPath } from 'node:url'
import PageFlow from '../plugin/index'
import type { PageFlowOptions, PageFlowRuntimeRoute } from '../shared/types'

const ASTRO_ROUTES_ID = 'virtual:unplugin-pageflow/astro-routes'
const ASTRO_ROUTES_RESOLVED_ID = `\0${ASTRO_ROUTES_ID}`

export default function pageflowAstro(options: PageFlowOptions = {}): AstroIntegration {
  let routes: PageFlowRuntimeRoute[] = []
  return {
    name: 'unplugin-pageflow',
    hooks: {
      'astro:config:setup': ({ command, config, updateConfig, injectScript }) => {
        if (command !== 'dev' || options.enabled === false) return
        const projectRoot = fileURLToPath(config.root)
        updateConfig({
          vite: {
            plugins: [
              PageFlow.vite({ ...options, framework: 'astro', projectRoot }),
              {
                name: 'unplugin-pageflow-astro-routes',
                resolveId(id: string) { if (id === ASTRO_ROUTES_ID) return ASTRO_ROUTES_RESOLVED_ID },
                load(id: string) { if (id === ASTRO_ROUTES_RESOLVED_ID) return `export default ${JSON.stringify(routes)}` },
              },
            ],
          },
        })
        injectScript('page', `import routes from '${ASTRO_ROUTES_ID}'; window.__UNPLUGIN_PAGEFLOW_ROUTES__ = routes; import('virtual:unplugin-pageflow/runtime')`)
      },
      'astro:routes:resolved': ({ routes: resolvedRoutes }) => {
        routes = resolvedRoutes
          .filter(route => route.type === 'page' && route.pathname && !route.entrypoint.startsWith('astro-default-'))
          .map(route => ({
            id: route.pathname === '/' ? 'index' : route.pathname!.replace(/^\/|\/$/g, ''),
            path: route.pathname!,
            title: route.pathname === '/' ? 'index' : route.pathname!.split('/').filter(Boolean).at(-1)!,
            componentFile: route.entrypoint,
          }))
      },
    },
  }
}
