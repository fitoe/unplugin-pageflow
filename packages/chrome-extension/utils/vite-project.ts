import type { PageFlowGraph, ResolvedPageFlowOptions } from '../../../src/shared/types'
import type { PageFlowHostState } from '@pageflow/core/host'

type ProjectCanvasOptions = Pick<ResolvedPageFlowOptions, 'groupNames' | 'pageNames' | 'canvasLayouts'> & {
  pages: PageFlowHostState['pages']
}

type PublicGraph = { pages: Array<Pick<PageFlowGraph['pages'][number], 'id' | 'title' | 'path'>> }

interface PublicPageFlowProject extends Partial<ProjectCanvasOptions> {
  graph?: PublicGraph
}

function parseVitePageFlowConfig(source: string): Partial<ProjectCanvasOptions> | undefined {
  const match = source.match(/^export default (\{.*\})\s*(?:\/\/# sourceMappingURL=|$)/s)
  if (!match) return
  try { return JSON.parse(match[1]) as Partial<ProjectCanvasOptions> }
  catch { return }
}

export function translateViteCanvasLayouts(
  layouts: ResolvedPageFlowOptions['canvasLayouts'] | undefined,
  graph: { pages: Array<Pick<PageFlowGraph['pages'][number], 'id' | 'path'>> },
  origin: string,
) {
  if (!layouts) return {}
  const pathsById = new Map(graph.pages.map(page => [page.id, page.path]))
  return Object.fromEntries(Object.entries(layouts).map(([group, positions]) => [group,
    Object.fromEntries(Object.entries(positions).flatMap(([id, position]) => {
      const path = pathsById.get(id)
      return path ? [[new URL(path, origin).href, position]] : []
    })),
  ]))
}

function resolveProject(config: PublicPageFlowProject, graph: PublicGraph, origin: string): Partial<ProjectCanvasOptions> {
  return {
    groupNames: config.groupNames ?? {},
    pageNames: config.pageNames ?? {},
    canvasLayouts: translateViteCanvasLayouts(config.canvasLayouts, graph, origin),
    pages: (config.pages ?? graph.pages.map(page => ({
      url: new URL(page.path, origin).href,
      routeKey: new URL(page.path, origin).href,
      discovered: true,
      title: page.title,
      updatedAt: Date.now(),
    }))),
  }
}

export async function loadVitePageFlowProject(origin: string, declaredUrl?: string): Promise<Partial<ProjectCanvasOptions>> {
  const publicUrls = [
    declaredUrl,
    new URL('/.well-known/pageflow.json', origin).href,
    new URL('/__pageflow/config.json', origin).href,
  ].filter((url, index, values): url is string => Boolean(url) && values.indexOf(url) === index)
  for (const url of publicUrls) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      const config = await response.json() as PublicPageFlowProject
      const graph = config.graph ?? (config.pages ? { pages: config.pages.map(page => ({ id: page.routeKey ?? page.url, path: new URL(page.url).pathname, title: page.title })) } : undefined)
      if (graph) return resolveProject(config, graph, origin)
    } catch {}
  }
  try {
    const [configResponse, graphResponse] = await Promise.all([
      fetch(new URL('/@id/__x00__virtual:unplugin-pageflow/config', origin)),
      fetch(new URL('/__unplugin-pageflow/api/graph', origin)),
    ])
    if (!configResponse.ok || !graphResponse.ok) return {}
    const config = parseVitePageFlowConfig(await configResponse.text())
    if (!config) return {}
    const graph = await graphResponse.json() as PageFlowGraph
    return resolveProject(config, graph, origin)
  } catch {
    return {}
  }
}
