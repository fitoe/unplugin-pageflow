import type { PageFlowLink, PageFlowPage } from '../shared/types'
import { assignOrderedFocusSides, collapseRepeatedListLinks, PAGE_CARD_WIDTH } from './layout'

function resolveLinkTarget(link: PageFlowLink, pagesById: Map<string, PageFlowPage>, pagesByPath: Map<string, PageFlowPage>) {
  const locationPath = link.location?.split(/[?#]/, 1)[0]
  return pagesById.get(link.to) ?? pagesByPath.get(link.to) ?? (locationPath ? pagesByPath.get(locationPath) : undefined)
}

export function nearestPointOnRect(
  point: { x: number, y: number },
  rect: { x: number, y: number, width: number, height: number },
) {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  const x = Math.max(rect.x, Math.min(right, point.x))
  const y = Math.max(rect.y, Math.min(bottom, point.y))
  if (x !== point.x || y !== point.y) return { x, y }
  const edges = [
    { x: rect.x, y: point.y, distance: point.x - rect.x },
    { x: right, y: point.y, distance: right - point.x },
    { x: point.x, y: rect.y, distance: point.y - rect.y },
    { x: point.x, y: bottom, distance: bottom - point.y },
  ]
  const nearest = edges.sort((left, rightEdge) => left.distance - rightEdge.distance)[0]
  return { x: nearest.x, y: nearest.y }
}

export function curvedConnectionPath(start: { x: number, y: number }, end: { x: number, y: number }) {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const handle = Math.max(18, Math.min(72, Math.hypot(deltaX, deltaY) * 0.36))
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    const direction = Math.sign(deltaX) || 1
    return `M${start.x} ${start.y} C${start.x + direction * handle} ${start.y} ${end.x - direction * handle} ${end.y} ${end.x} ${end.y}`
  }
  const direction = Math.sign(deltaY) || 1
  return `M${start.x} ${start.y} C${start.x} ${start.y + direction * handle} ${end.x} ${end.y - direction * handle} ${end.x} ${end.y}`
}

export interface FocusLayoutOptions {
  pages: PageFlowPage[]
  focusedPageId?: string
  links: PageFlowLink[]
  positions: Map<string, [number, number]>
  targetPositions: Record<string, [number, number]>
  pagePreviewHeight(pageId: string): number
  pageCardHeight(pageId: string): number
  selectedPageScale?: number
}

export function resolveFocusTargetPageIds(pages: PageFlowPage[], links: PageFlowLink[], focusedPageId?: string) {
  const pagesById = new Map(pages.map(page => [page.id, page]))
  const pagesByPath = new Map(pages.map(page => [page.path, page]))
  return [...new Set(links.flatMap((link) => {
    const target = resolveLinkTarget(link, pagesById, pagesByPath)
    return target && target.id !== focusedPageId ? [target.id] : []
  }))]
}

export function createFocusScene(options: FocusLayoutOptions) {
  const {
    pages,
    focusedPageId,
    links,
    positions,
    targetPositions,
    pagePreviewHeight,
    pageCardHeight,
    selectedPageScale = 1.03,
  } = options
  const source = pages.find(page => page.id === focusedPageId)
  const sourcePosition = source && positions.get(source.id)
  if (!source || !sourcePosition) return
  const pagesById = new Map(pages.map(page => [page.id, page]))
  const pagesByPath = new Map(pages.map(page => [page.path, page]))
  const targetsById = new Map<string, PageFlowPage>()
  const linksByTargetId = new Map<string, PageFlowLink[]>()
  const resolvedLinks = collapseRepeatedListLinks(links).flatMap(link => {
    const target = resolveLinkTarget(link, pagesById, pagesByPath)
    if (!target || target.id === source.id) return []
    targetsById.set(target.id, target)
    linksByTargetId.set(target.id, [...(linksByTargetId.get(target.id) ?? []), link])
    return [{ link, target }]
  })
  const targetMetrics = [...targetsById.values()].map(page => {
    const targetLinks = linksByTargetId.get(page.id) ?? []
    const hotspots = targetLinks.flatMap(link => link.hotspot ? [link.hotspot] : [])
    const centerX = hotspots.length ? hotspots.reduce((sum, hotspot) => sum + hotspot.centerX, 0) / hotspots.length : 0.5
    const centerY = hotspots.length ? hotspots.reduce((sum, hotspot) => sum + hotspot.centerY, 0) / hotspots.length : 0.5
    return { id: page.id, page, centerX, centerY }
  })
  const assignedSides = assignOrderedFocusSides(targetMetrics)
  const sides = {
    left: assignedSides.left.map(item => item.page),
    right: assignedSides.right.map(item => item.page),
    top: assignedSides.top.map(item => item.page),
    bottom: assignedSides.bottom.map(item => item.page),
  }
  const scale = 0.5
  const gap = 24
  const ringGap = 36
  const packLanes = (items: PageFlowPage[]) => {
    const lanes: PageFlowPage[][] = [[]]
    let span = 0
    items.forEach(page => {
      const size = pageCardHeight(page.id) * scale
      if (lanes[lanes.length - 1].length && span + gap + size > 900) {
        lanes.push([])
        span = 0
      }
      lanes[lanes.length - 1].push(page)
      span += (span ? gap : 0) + size
    })
    return lanes.filter(lane => lane.length)
  }
  const layoutVertical = (side: 'left' | 'right') => packLanes(sides[side]).flatMap((lane, ring) => {
    const heights = lane.map(page => pageCardHeight(page.id) * scale)
    const desiredTops = lane.map((page, index) => {
      const hotspots = (linksByTargetId.get(page.id) ?? []).flatMap(link => link.hotspot ? [link.hotspot] : [])
      const hotspotY = hotspots.length ? hotspots.reduce((sum, hotspot) => sum + hotspot.centerY, 0) / hotspots.length : 0.5
      return sourcePosition[1] + hotspotY * pagePreviewHeight(source.id) - heights[index] / 2
    })
    const tops: number[] = []
    desiredTops.forEach((desiredTop, index) => {
      tops[index] = index ? Math.max(desiredTop, tops[index - 1] + heights[index - 1] + gap) : desiredTop
    })
    for (let index = tops.length - 2; index >= 0; index--)
      tops[index] = Math.min(tops[index], tops[index + 1] - heights[index] - gap)
    return lane.map((page, index) => ({
      page,
      scale,
      side,
      x: side === 'right'
        ? sourcePosition[0] + PAGE_CARD_WIDTH + ringGap + ring * (PAGE_CARD_WIDTH * scale + ringGap)
        : sourcePosition[0] - ringGap - PAGE_CARD_WIDTH * scale - ring * (PAGE_CARD_WIDTH * scale + ringGap),
      y: tops[index],
    } as const))
  })
  const layoutHorizontal = (side: 'top' | 'bottom') => {
    const lanes = Array.from({ length: Math.ceil(sides[side].length / 3) }, (_, index) => sides[side].slice(index * 3, index * 3 + 3))
    let outerOffset = 0
    return lanes.flatMap(lane => {
      const width = PAGE_CARD_WIDTH * scale
      const heights = lane.map(page => pageCardHeight(page.id) * scale)
      const desiredLefts = lane.map(page => {
        const metric = targetMetrics.find(item => item.id === page.id)
        return sourcePosition[0] + (metric?.centerX ?? 0.5) * PAGE_CARD_WIDTH - width / 2
      })
      const lefts: number[] = []
      desiredLefts.forEach((desiredLeft, index) => {
        lefts[index] = index ? Math.max(desiredLeft, lefts[index - 1] + width + gap) : desiredLeft
      })
      for (let index = lefts.length - 2; index >= 0; index--)
        lefts[index] = Math.min(lefts[index], lefts[index + 1] - width - gap)
      const laneHeight = Math.max(...heights, 0)
      const y = side === 'top'
        ? sourcePosition[1] - ringGap - outerOffset - laneHeight
        : sourcePosition[1] + pageCardHeight(source.id) + ringGap + outerOffset
      outerOffset += laneHeight + gap
      return lane.map((page, index) => ({ page, scale, side, x: lefts[index], y } as const))
    })
  }
  const targets = [
    ...layoutHorizontal('top'),
    ...layoutVertical('right'),
    ...layoutHorizontal('bottom'),
    ...layoutVertical('left'),
  ].map(target => {
    const position = targetPositions[target.page.id]
    return position ? { ...target, x: position[0], y: position[1] } : target
  })
  const positionsById = new Map(targets.map(target => [target.page.id, target]))
  const connections = resolvedLinks.flatMap(({ link, target }, index) => {
    const targetPosition = positionsById.get(target.id)
    if (!targetPosition) return []
    const sourceHeight = pagePreviewHeight(source.id)
    const startX = sourcePosition[0] + PAGE_CARD_WIDTH / 2
      + ((link.hotspot?.centerX ?? 0.5) * PAGE_CARD_WIDTH - PAGE_CARD_WIDTH / 2) * selectedPageScale
    const startY = sourcePosition[1] + sourceHeight / 2
      + ((link.hotspot?.centerY ?? 0.5) * sourceHeight - sourceHeight / 2) * selectedPageScale
    const end = nearestPointOnRect({ x: startX, y: startY }, {
      x: targetPosition.x,
      y: targetPosition.y,
      width: PAGE_CARD_WIDTH * targetPosition.scale,
      height: pageCardHeight(target.id) * targetPosition.scale,
    })
    return [{
      id: `${source.id}:${index}:${target.id}`,
      targetId: target.id,
      centerX: link.hotspot?.centerX,
      centerY: link.hotspot?.centerY,
      d: curvedConnectionPath({ x: startX, y: startY }, end),
    }]
  })
  return { source, sourcePosition, targets, connections }
}
