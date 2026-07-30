import ELK from 'elkjs/lib/elk-api.js'
import ELKWorker from 'elkjs/lib/elk-worker.min.js?worker'
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api'
import type { PageFlowPage } from '../shared/types'
import { PAGE_CARD_HEIGHT, PAGE_CARD_WIDTH } from './layout'

const elk = typeof Worker === 'undefined'
  ? import('elkjs/lib/elk.bundled.js').then(module => new module.default())
  : Promise.resolve(new ELK({ workerFactory: () => new ELKWorker() }))

export async function layoutPagesWithElk(items: PageFlowPage[], cardHeights = new Map<string, number>()) {
  if (!items.length) return new Map<string, [number, number]>()
  const pageIds = new Set(items.map(page => page.id))
  const directoryNode = (path: string) => `__pageflow_directory__:${path}`
  const rootDirectory = directoryNode('/')
  const nodes = new Map<string, ElkNode>([[rootDirectory, { id: rootDirectory, width: 1, height: 1 }]])
  const edges: ElkExtendedEdge[] = []
  const edgeIds = new Set<string>()
  const addEdge = (id: string, source: string, target: string, priority: number) => {
    if (edgeIds.has(id)) return
    edgeIds.add(id)
    edges.push({ id, sources: [source], targets: [target], layoutOptions: { 'elk.priority': String(priority) } })
  }

  items.forEach(page => {
    nodes.set(page.id, {
      id: page.id,
      width: PAGE_CARD_WIDTH,
      height: cardHeights.get(page.id) ?? PAGE_CARD_HEIGHT,
    })
    const segments = (page.path ?? page.id).split('/').filter(Boolean)
    let parent = rootDirectory
    segments.slice(0, -1).forEach((_, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`
      const directory = directoryNode(path)
      if (!nodes.has(directory)) nodes.set(directory, { id: directory, width: 1, height: 1 })
      addEdge(`directory:${path}`, parent, directory, 8)
      parent = directory
    })
    addEdge(`route:${page.id}`, parent, page.id, 8)
  })
  items.forEach(page => page.links.forEach((link, index) => {
    if (pageIds.has(link.to) && link.to !== page.id)
      addEdge(`link:${page.id}:${index}:${link.to}`, page.id, link.to, 1)
  }))

  const result = await (await elk).layout({
    id: 'pageflow',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.spacing.nodeNodeBetweenLayers': '180',
      'elk.padding': '[top=64,left=64,bottom=64,right=64]',
      'elk.spacing.nodeNode': '72',
    },
    children: [...nodes.values()],
    edges,
  })
  return new Map(items.flatMap(page => {
    const node = result.children?.find(item => item.id === page.id)
    return node?.x != null && node.y != null ? [[page.id, [node.x, node.y] as [number, number]] as const] : []
  }))
}
