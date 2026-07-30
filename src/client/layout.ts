import type { PageFlowPage } from '../shared/types'

export const PAGE_CARD_WIDTH = 240
export const PAGE_CARD_HEIGHT = 290
export const PAGE_PREVIEW_INSET = 16
export const PAGE_PREVIEW_WIDTH = 208
export const PAGE_PREVIEW_HEIGHT = 150

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

export function layoutPages(items: PageFlowPage[]) {
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

  const rows = new Map<number, number>()
  return new Map(items.map(page => {
    const level = levels.get(page.id)!
    const row = rows.get(level) ?? 0
    rows.set(level, row + 1)
    return [page.id, [80 + level * 350, 90 + row * 340] as [number, number]]
  }))
}

export function getVisiblePageIds(
  pages: PageFlowPage[],
  positions: Map<string, [number, number]>,
  viewport: ViewportSize,
  transform: CanvasTransform,
  margin = 240,
) {
  const visible = new Set<string>()
  pages.forEach(page => {
    const position = positions.get(page.id)
    if (!position) return
    const left = transform.x + position[0] * transform.scaleX
    const top = transform.y + position[1] * transform.scaleY
    const right = left + PAGE_CARD_WIDTH * transform.scaleX
    const bottom = top + PAGE_CARD_HEIGHT * transform.scaleY
    if (right >= -margin && left <= viewport.width + margin && bottom >= -margin && top <= viewport.height + margin)
      visible.add(page.id)
  })
  return visible
}
