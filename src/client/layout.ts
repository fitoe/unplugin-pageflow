import type { PageFlowPage } from '../shared/types'

export const PAGE_CARD_WIDTH = 240
export const PAGE_CARD_HEIGHT = 256
export const PAGE_CARD_META_HEIGHT = 68
export const PAGE_PREVIEW_INSET = 0
export const PAGE_PREVIEW_WIDTH = 240
export const PAGE_PREVIEW_HEIGHT = 169
export const PAGEFLOW_AUTO_PREVIEW_SCALE = 1.25

export interface CanvasTransform {
  x: number
  y: number
  scaleX: number
  scaleY: number
}

export interface ViewportSize {
  width: number
  height: number
}

export interface PageBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export function centerPageTransform(
  position: [number, number],
  pageHeight: number,
  viewport: ViewportSize,
  scale: number,
): CanvasTransform {
  return {
    x: viewport.width / 2 - (position[0] + PAGE_CARD_WIDTH / 2) * scale,
    y: viewport.height / 2 - (position[1] + pageHeight / 2) * scale,
    scaleX: scale,
    scaleY: scale,
  }
}

export interface PageSpatialIndex {
  cellSize: number
  cells: Map<string, Set<string>>
  boundsById: Map<string, PageBounds>
  pagesById: Map<string, PageFlowPage>
}

function cellKey(column: number, row: number) {
  return `${column}:${row}`
}

export function createPageSpatialIndex(
  pages: PageFlowPage[],
  positions: Map<string, [number, number]>,
  cardHeights = new Map<string, number>(),
  cellSize = 512,
): PageSpatialIndex {
  const cells = new Map<string, Set<string>>()
  const boundsById = new Map<string, PageBounds>()
  pages.forEach(page => {
    const position = positions.get(page.id)
    if (!position) return
    const bounds = {
      left: position[0],
      top: position[1],
      right: position[0] + PAGE_CARD_WIDTH,
      bottom: position[1] + (cardHeights.get(page.id) ?? PAGE_CARD_HEIGHT),
    }
    boundsById.set(page.id, bounds)
    const firstColumn = Math.floor(bounds.left / cellSize)
    const lastColumn = Math.floor(bounds.right / cellSize)
    const firstRow = Math.floor(bounds.top / cellSize)
    const lastRow = Math.floor(bounds.bottom / cellSize)
    for (let column = firstColumn; column <= lastColumn; column++) {
      for (let row = firstRow; row <= lastRow; row++) {
        const key = cellKey(column, row)
        const ids = cells.get(key) ?? new Set<string>()
        ids.add(page.id)
        cells.set(key, ids)
      }
    }
  })
  return { cellSize, cells, boundsById, pagesById: new Map(pages.map(page => [page.id, page])) }
}

export function queryPageSpatialIndex(index: PageSpatialIndex, bounds: PageBounds) {
  const firstColumn = Math.floor(bounds.left / index.cellSize)
  const lastColumn = Math.floor(bounds.right / index.cellSize)
  const firstRow = Math.floor(bounds.top / index.cellSize)
  const lastRow = Math.floor(bounds.bottom / index.cellSize)
  const cellCount = (lastColumn - firstColumn + 1) * (lastRow - firstRow + 1)
  if (cellCount > index.cells.size * 2) return new Set(index.boundsById.keys())
  const ids = new Set<string>()
  for (let column = firstColumn; column <= lastColumn; column++) {
    for (let row = firstRow; row <= lastRow; row++) {
      index.cells.get(cellKey(column, row))?.forEach(id => ids.add(id))
    }
  }
  return ids
}

export function getRenderablePages(
  pages: PageFlowPage[],
  visibleIds: Set<string>,
  pinnedIds: Array<string | undefined> = [],
  maximumVisible = Number.POSITIVE_INFINITY,
) {
  const pageIds = new Set(pages.map(page => page.id))
  const selectedIds = new Set(pinnedIds.filter((id): id is string => Boolean(id && pageIds.has(id))))
  let visibleCount = 0
  for (const page of pages) {
    if (selectedIds.has(page.id) || !visibleIds.has(page.id) || visibleCount >= maximumVisible) continue
    selectedIds.add(page.id)
    visibleCount++
  }
  return pages.filter(page => selectedIds.has(page.id))
}

export function layoutPages(items: PageFlowPage[], cardHeights = new Map<string, number>()) {
  const pagesById = new Map(items.map(page => [page.id, page]))
  const incoming = new Map(items.map(page => [page.id, 0]))
  items.forEach(page => page.links.forEach(link => {
    if (incoming.has(link.to)) incoming.set(link.to, incoming.get(link.to)! + 1)
  }))

  const levels = new Map<string, number>()
  const queue = items.filter(page => incoming.get(page.id) === 0).map(page => page.id)
  if (!queue.length && items[0]) queue.push(items[0].id)
  queue.forEach(id => levels.set(id, 0))
  while (queue.length) {
    const id = queue.shift()!
    const level = levels.get(id)!
    pagesById.get(id)?.links.forEach(link => {
      if (!pagesById.has(link.to) || levels.has(link.to)) return
      levels.set(link.to, level + 1)
      queue.push(link.to)
    })
  }
  items.forEach(page => {
    if (!levels.has(page.id)) levels.set(page.id, 0)
  })

  const offsets = new Map<number, number>()
  return new Map(items.map(page => {
    const level = levels.get(page.id)!
    const y = offsets.get(level) ?? 64
    offsets.set(level, y + (cardHeights.get(page.id) ?? PAGE_CARD_HEIGHT) + 48)
    return [page.id, [64 + level * 320, y] as [number, number]]
  }))
}

export function layoutPagesByRoute(items: PageFlowPage[], cardHeights = new Map<string, number>()) {
  const columnGap = 100
  const rowGap = 120
  const treeGap = 200
  const root: RouteTreeNode = { key: '', depth: -1, pages: [], children: new Map() }
  items.forEach(page => insertRoutePage(root, page))
  const positions = new Map<string, [number, number]>()
  let treeTop = 64
  ;[...root.children.values()].sort((left, right) => left.key.localeCompare(right.key)).forEach(tree => {
    const rowHeights = new Map<number, number>()
    collectTreePages(tree).forEach(page => {
      const depth = routeSegments(page).length - 1
      rowHeights.set(depth, Math.max(rowHeights.get(depth) ?? 0, cardHeights.get(page.id) ?? PAGE_CARD_HEIGHT))
    })
    const rowTops = new Map<number, number>()
    let nextRowTop = treeTop
    for (let depth = 0; depth <= Math.max(0, ...rowHeights.keys()); depth++) {
      rowTops.set(depth, nextRowTop)
      nextRowTop += (rowHeights.get(depth) ?? 0) + rowGap
    }
    const sortedChildren = (node: RouteTreeNode) => [...node.children.values()].sort((left, right) => left.key.localeCompare(right.key))
    const widths = new Map<RouteTreeNode, number>()
    const measure = (node: RouteTreeNode): number => {
      const children = sortedChildren(node)
      const childrenWidth = children.reduce((total, child, index) => total + measure(child) + (index ? columnGap : 0), 0)
      const pagesWidth = Math.max(1, node.pages.length) * PAGE_CARD_WIDTH + Math.max(0, node.pages.length - 1) * columnGap
      const width = Math.max(childrenWidth, pagesWidth)
      widths.set(node, width)
      return width
    }
    measure(tree)
    const place = (node: RouteTreeNode, left: number): number => {
      const nodeWidth = widths.get(node)!
      const children = sortedChildren(node)
      const childrenWidth = children.reduce((total, child, index) => total + widths.get(child)! + (index ? columnGap : 0), 0)
      let childLeft = left + (nodeWidth - childrenWidth) / 2
      children.forEach(child => {
        place(child, childLeft)
        childLeft += widths.get(child)! + columnGap
      })
      const center = left + nodeWidth / 2
      const pagesWidth = node.pages.length * PAGE_CARD_WIDTH + Math.max(0, node.pages.length - 1) * columnGap
      node.pages
        .sort((left, right) => (left.path || left.id).localeCompare(right.path || right.id))
        .forEach((page, index) => positions.set(page.id, [center - pagesWidth / 2 + index * (PAGE_CARD_WIDTH + columnGap), rowTops.get(node.depth) ?? treeTop]))
      return center
    }
    place(tree, 64)
    treeTop = nextRowTop + treeGap
  })
  return positions
}

interface RouteTreeNode {
  key: string
  depth: number
  pages: PageFlowPage[]
  children: Map<string, RouteTreeNode>
}

function insertRoutePage(root: RouteTreeNode, page: PageFlowPage) {
  const segments = routeSegments(page)
  let node = root
  segments.forEach((segment, depth) => {
    let child = node.children.get(segment)
    if (!child) {
      child = { key: segment, depth, pages: [], children: new Map() }
      node.children.set(segment, child)
    }
    node = child
  })
  node.pages.push(page)
}

function routeSegments(page: PageFlowPage) {
  const segments = (page.path || page.id).split(/[/?#]/).filter(Boolean)
  if (segments[0] === 'pages') segments.shift()
  segments.pop()
  if (!segments.length) segments.push('/')
  return segments
}

function collectTreePages(node: RouteTreeNode): PageFlowPage[] {
  return [...node.pages, ...[...node.children.values()].flatMap(collectTreePages)]
}

export function getVisiblePageIds(
  pages: PageFlowPage[],
  positions: Map<string, [number, number]>,
  viewport: ViewportSize,
  transform: CanvasTransform,
  margin = 240,
  cardHeights = new Map<string, number>(),
  maximum = Number.POSITIVE_INFINITY,
  spatialIndex?: PageSpatialIndex,
) {
  const visible: Array<{ id: string, distance: number }> = []
  const viewportCenterX = viewport.width / 2
  const viewportCenterY = viewport.height / 2
  const worldBounds = {
    left: (-margin - transform.x) / transform.scaleX,
    top: (-margin - transform.y) / transform.scaleY,
    right: (viewport.width + margin - transform.x) / transform.scaleX,
    bottom: (viewport.height + margin - transform.y) / transform.scaleY,
  }
  const candidates = spatialIndex
    ? [...queryPageSpatialIndex(spatialIndex, worldBounds)].flatMap(id => spatialIndex.pagesById.get(id) ?? [])
    : pages
  candidates.forEach(page => {
    const position = positions.get(page.id)
    if (!position) return
    const left = transform.x + position[0] * transform.scaleX
    const top = transform.y + position[1] * transform.scaleY
    const right = left + PAGE_CARD_WIDTH * transform.scaleX
    const bottom = top + (cardHeights.get(page.id) ?? PAGE_CARD_HEIGHT) * transform.scaleY
    if (right >= -margin && left <= viewport.width + margin && bottom >= -margin && top <= viewport.height + margin) {
      const centerX = (left + right) / 2
      const centerY = (top + bottom) / 2
      visible.push({
        id: page.id,
        distance: (centerX - viewportCenterX) ** 2 + (centerY - viewportCenterY) ** 2,
      })
    }
  })
  if (visible.length > maximum) visible.sort((a, b) => a.distance - b.distance).length = maximum
  return new Set(visible.map(page => page.id))
}

export function getAutoPreviewPageId(
  pages: PageFlowPage[],
  positions: Map<string, [number, number]>,
  viewport: ViewportSize,
  transform: CanvasTransform,
  cardHeights = new Map<string, number>(),
  spatialIndex?: PageSpatialIndex,
) {
  if (transform.scaleX < PAGEFLOW_AUTO_PREVIEW_SCALE) return
  return getVisiblePageIds(
    pages,
    positions,
    viewport,
    transform,
    0,
    cardHeights,
    1,
    spatialIndex,
  ).values().next().value as string | undefined
}
