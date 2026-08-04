import type { PageFlowLink, PageFlowPage } from '../shared/types'

export const PAGE_CARD_WIDTH = 240
export const PAGE_CARD_HEIGHT = 256
export const PAGE_CARD_META_HEIGHT = 68
export const PAGE_PREVIEW_INSET = 0
export const PAGEFLOW_AUTO_PREVIEW_SCALE = 1.25
export const PAGE_GRID_GAP_X = 88
export const PAGE_GRID_GAP_Y = 30
const PAGE_GRID_INSET = 64

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

export function fitPageBoundsTransform(
  bounds: PageBounds,
  viewport: ViewportSize,
  maximumScale = 0.9,
  padding = 72,
): CanvasTransform {
  const scale = Math.max(0.05, Math.min(
    maximumScale,
    (viewport.width - padding * 2) / Math.max(1, bounds.right - bounds.left),
    (viewport.height - padding * 2) / Math.max(1, bounds.bottom - bounds.top),
  ))
  return {
    x: viewport.width / 2 - (bounds.left + bounds.right) / 2 * scale,
    y: viewport.height / 2 - (bounds.top + bounds.bottom) / 2 * scale,
    scaleX: scale,
    scaleY: scale,
  }
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

export function fitFocusedPreviewTransform(
  position: [number, number],
  previewHeight: number,
  viewport: ViewportSize,
  selectedScale = 1,
  topPadding = 32,
  bottomPadding = 16,
  maxPreviewWidth = viewport.width,
): CanvasTransform {
  const availableHeight = Math.max(1, viewport.height - topPadding - bottomPadding)
  const heightScale = availableHeight / Math.max(1, previewHeight * selectedScale)
  const availableWidth = Math.max(1, Math.min(maxPreviewWidth, viewport.width - 32))
  const widthScale = availableWidth / Math.max(1, PAGE_CARD_WIDTH * selectedScale)
  const scale = Math.min(heightScale, widthScale)
  return {
    x: viewport.width / 2 - (position[0] + PAGE_CARD_WIDTH / 2) * scale,
    y: topPadding + availableHeight / 2 - (position[1] + previewHeight / 2) * scale,
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

export function responsivePageGridColumns(
  viewport: ViewportSize,
  items: PageFlowPage[],
  cardHeights = new Map<string, number>(),
) {
  const availableWidth = Math.max(PAGE_CARD_WIDTH, viewport.width - PAGE_GRID_INSET * 2)
  const availableHeight = Math.max(PAGE_CARD_HEIGHT, viewport.height - PAGE_GRID_INSET * 2)
  const maximumColumns = Math.max(1, Math.floor((availableWidth + PAGE_GRID_GAP_X) / (PAGE_CARD_WIDTH + PAGE_GRID_GAP_X)))
  const totalCardHeight = items.reduce((total, page) => total + (cardHeights.get(page.id) ?? PAGE_CARD_HEIGHT) + PAGE_GRID_GAP_Y, 0)
  const balancedColumns = Math.max(1, Math.round(Math.sqrt(
    (availableWidth / availableHeight) * totalCardHeight / (PAGE_CARD_WIDTH + PAGE_GRID_GAP_X),
  )))
  return Math.min(Math.max(1, items.length), maximumColumns, balancedColumns)
}

export function layoutPageGrid(items: PageFlowPage[], cardHeights = new Map<string, number>(), columns = 5) {
  const columnCount = Math.max(1, Math.min(columns, Math.max(1, items.length)))
  const columnBottoms = Array.from({ length: columnCount }, () => PAGE_GRID_INSET)
  return new Map(items.map(page => {
    const column = columnBottoms.reduce((shortest, bottom, index) => bottom < columnBottoms[shortest] ? index : shortest, 0)
    const position: [number, number] = [
      PAGE_GRID_INSET + column * (PAGE_CARD_WIDTH + PAGE_GRID_GAP_X),
      columnBottoms[column],
    ]
    columnBottoms[column] += (cardHeights.get(page.id) ?? PAGE_CARD_HEIGHT) + PAGE_GRID_GAP_Y
    return [page.id, position]
  }))
}

export interface FocusSideItem {
  id: string
  centerX: number
  centerY: number
}

export function collapseRepeatedListLinks(links: PageFlowLink[]) {
  const byTarget = new Map<string, PageFlowLink[]>()
  links.forEach(link => byTarget.set(link.to, [...(byTarget.get(link.to) ?? []), link]))
  const collapsedTargets = new Map<string, PageFlowLink>()
  byTarget.forEach((targetLinks, target) => {
    const hotspots = targetLinks.flatMap(link => link.hotspot ? [link.hotspot] : [])
    if (hotspots.length < 3) return
    const xValues = hotspots.map(hotspot => hotspot.centerX)
    const yValues = hotspots.map(hotspot => hotspot.centerY)
    if (Math.max(...xValues) - Math.min(...xValues) > 0.2 || Math.max(...yValues) - Math.min(...yValues) < 0.12) return
    collapsedTargets.set(target, [...targetLinks]
      .filter(link => link.hotspot)
      .sort((left, right) => left.hotspot!.centerY - right.hotspot!.centerY)[Math.floor(hotspots.length / 2)])
  })
  const emitted = new Set<string>()
  return links.filter(link => {
    const representative = collapsedTargets.get(link.to)
    if (!representative) return true
    if (link !== representative || emitted.has(link.to)) return false
    emitted.add(link.to)
    return true
  })
}

export function assignOrderedFocusSides<T extends FocusSideItem>(items: T[]) {
  const sides: { left: T[], right: T[], top: T[], bottom: T[] } = { left: [], right: [], top: [], bottom: [] }
  const horizontalCapacity = Math.max(4, Math.ceil(items.length * 0.4))
  ;[...items]
    .sort((left, right) => Math.abs(right.centerX - 0.5) - Math.abs(left.centerX - 0.5) || left.centerY - right.centerY)
    .forEach(item => {
      const costs = {
        left: item.centerX + sides.left.length * 0.16 + (sides.left.length >= horizontalCapacity ? 10 : 0),
        right: 1 - item.centerX + sides.right.length * 0.16 + (sides.right.length >= horizontalCapacity ? 10 : 0),
        top: item.centerY + 0.6 + sides.top.length * 0.16,
        bottom: 1 - item.centerY + 0.6 + sides.bottom.length * 0.16,
      }
      const side = (Object.keys(costs) as Array<keyof typeof costs>)
        .reduce((best, candidate) => costs[candidate] < costs[best] ? candidate : best, 'left')
      sides[side].push(item)
    })
  sides.left.sort((left, right) => left.centerY - right.centerY)
  sides.right.sort((left, right) => left.centerY - right.centerY)
  sides.top.sort((left, right) => left.centerX - right.centerX)
  sides.bottom.sort((left, right) => left.centerX - right.centerX)
  return sides
}

export function layoutPagesByRoute(items: PageFlowPage[], cardHeights = new Map<string, number>()) {
  const columnGap = 100
  const rowGap = 120
  const treeGap = 200
  const root: RouteTreeNode = { key: '', depth: -1, order: Number.POSITIVE_INFINITY, pages: [], children: new Map() }
  items.forEach(page => insertRoutePage(root, page))
  const positions = new Map<string, [number, number]>()
  let treeTop = 64
  ;[...root.children.values()].sort(compareRouteNodes).forEach(tree => {
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
    const sortedChildren = (node: RouteTreeNode) => [...node.children.values()].sort(compareRouteNodes)
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
        .sort((left, right) => (left.routeOrder ?? Number.POSITIVE_INFINITY) - (right.routeOrder ?? Number.POSITIVE_INFINITY)
          || (left.path || left.id).localeCompare(right.path || right.id))
        .forEach((page, index) => positions.set(page.id, [center - pagesWidth / 2 + index * (PAGE_CARD_WIDTH + columnGap), rowTops.get(node.depth) ?? treeTop]))
      return center
    }
    place(tree, 64)
    treeTop = nextRowTop + treeGap
  })
  return positions
}

export interface RouteDeck {
  key: string
  label: string
  pages: PageFlowPage[]
  representative: PageFlowPage
}

function compareDeckPages(left: PageFlowPage, right: PageFlowPage) {
  const priority = (page: PageFlowPage) => {
    const name = pageRouteParts(page).at(-1)?.toLowerCase() ?? ''
    if (/^(index|home)$/.test(name)) return 0
    if (/^(list|listing)$/.test(name)) return 1
    if (/^(search|filter)$/.test(name)) return 2
    if (/^(create|add|new|publish|edit|fill|form)$/.test(name)) return 3
    if (/^(detail|show|view)$/.test(name)) return 4
    if (/^(history|record|records|order|orders|log|logs)$/.test(name)) return 5
    if (/^(mine|profile|setting|settings)$/.test(name)) return 6
    return 7
  }
  return priority(left) - priority(right)
    || (left.routeOrder ?? Number.POSITIVE_INFINITY) - (right.routeOrder ?? Number.POSITIVE_INFINITY)
    || (left.path || left.id).localeCompare(right.path || right.id)
}

export function createRouteDeckView(items: PageFlowPage[], groupPath: string[] = []) {
  const directPages: PageFlowPage[] = []
  const grouped = new Map<string, PageFlowPage[]>()
  items.forEach(page => {
    const segments = pageRouteParts(page)
    if (!groupPath.every((segment, index) => segments[index] === segment)) return
    const remaining = segments.slice(groupPath.length)
    if (remaining.length <= 1) directPages.push(page)
    else grouped.set(remaining[0], [...(grouped.get(remaining[0]) ?? []), page])
  })
  const decks = [...grouped.entries()].flatMap(([label, unsortedDeckPages]) => {
    const deckPath = [...groupPath, label]
    const indexPageIndex = directPages.findIndex((page) => {
      const segments = pageRouteParts(page)
      return segments.length === deckPath.length
        && deckPath.every((segment, index) => segments[index] === segment)
    })
    const indexPage = indexPageIndex < 0 ? undefined : directPages.splice(indexPageIndex, 1)[0]
    const deckPages = [
      ...(indexPage ? [indexPage] : []),
      ...[...unsortedDeckPages].sort(compareDeckPages),
    ]
    if (deckPages.length === 1) {
      directPages.push(deckPages[0])
      return []
    }
    return [{
    key: deckPath.join('/'),
    label,
    pages: deckPages,
    representative: deckPages[0],
    }]
  }).sort((left, right) => compareDeckPages(left.representative, right.representative))
  directPages.sort(compareDeckPages)
  return { directPages, decks }
}

export function promotedRouteGroupPath(items: PageFlowPage[]) {
  const root = createRouteDeckView(items)
  return root.directPages.length === 0 && root.decks.length === 1
    ? root.decks[0].key.split('/').filter(Boolean)
    : []
}

export function routeDeckPathForPage(items: PageFlowPage[], pageId: string) {
  const path: string[] = []
  while (true) {
    const deck = createRouteDeckView(items, path).decks.find(item => item.pages.some(page => page.id === pageId))
    if (!deck) return path
    path.push(deck.label)
  }
}

interface RouteTreeNode {
  key: string
  depth: number
  order: number
  pages: PageFlowPage[]
  children: Map<string, RouteTreeNode>
}

function insertRoutePage(root: RouteTreeNode, page: PageFlowPage) {
  const segments = routeSegments(page)
  let node = root
  segments.forEach((segment, depth) => {
    let child = node.children.get(segment)
    if (!child) {
      child = { key: segment, depth, order: page.routeOrder ?? Number.POSITIVE_INFINITY, pages: [], children: new Map() }
      node.children.set(segment, child)
    }
    child.order = Math.min(child.order, page.routeOrder ?? Number.POSITIVE_INFINITY)
    node = child
  })
  node.pages.push(page)
}

function compareRouteNodes(left: RouteTreeNode, right: RouteTreeNode) {
  return left.order - right.order || left.key.localeCompare(right.key)
}

function routeSegments(page: PageFlowPage) {
  const segments = pageRouteParts(page)
  segments.pop()
  if (!segments.length) segments.push('/')
  return segments
}

function pageRouteParts(page: PageFlowPage) {
  const segments = (page.path || page.id).split(/[/?#]/).filter(Boolean)
  if (segments[0] === 'pages') segments.shift()
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
