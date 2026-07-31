import { Group, Image as LeaferImage, Rect, Text } from 'leafer-ui'
import type { PageFlowPage, PageFlowThumbnailRecord } from '../shared/types'
import { PAGE_CARD_WIDTH } from './layout'

export interface PageCardOptions {
  page: PageFlowPage
  x: number
  y: number
  previewHeight: number
  tiles: PageFlowThumbnailRecord[]
  thumbnailSource(record: PageFlowThumbnailRecord): string | undefined
  copied?: boolean
  scale?: number
  highlighted?: boolean
  hideMeta?: boolean
}

export function createPageCardGroup(options: PageCardOptions) {
  const { page, x, y, previewHeight, tiles, thumbnailSource } = options
  const group = new Group({ x, y, scaleX: options.scale ?? 1, scaleY: options.scale ?? 1, hittable: false })
  group.add(new Rect({
    width: PAGE_CARD_WIDTH,
    height: previewHeight,
    fill: '#fff',
    shadow: options.highlighted
      ? { x: 0, y: 16, blur: 42, color: '#090a0b78' }
      : { x: 0, y: 8, blur: 20, color: '#090a0b40' },
  }))
  let hasThumbnail = false
  tiles.forEach(record => {
    const url = thumbnailSource(record)
    if (!url) return
    hasThumbnail = true
    group.add(new LeaferImage({
      x: 0,
      y: record.tileTop ?? 0,
      width: PAGE_CARD_WIDTH,
      height: record.tileIndex == null ? record.pageHeight ?? record.height : record.height,
      url,
      hittable: false,
    }))
  })
  if (!hasThumbnail) {
    group.add(new Text({ x: 16, y: Math.max(16, previewHeight - 54), width: PAGE_CARD_WIDTH - 32, text: page.title, fill: '#242628', fontSize: 18, fontWeight: 700, textWrap: 'none', textOverflow: 'ellipsis' }))
    group.add(new Text({ x: 16, y: Math.max(38, previewHeight - 29), width: PAGE_CARD_WIDTH - 32, text: page.path, fill: '#6f7478', fontFamily: 'DM Mono', fontSize: 10, textWrap: 'none', textOverflow: 'ellipsis' }))
  }
  if (!options.hideMeta) {
    group.add(new Text({ x: 0, y: previewHeight + 12, width: PAGE_CARD_WIDTH, text: page.title, fill: '#3f4347', fontSize: 13, fontWeight: 700, textWrap: 'none', textOverflow: 'ellipsis', cursor: 'default' }))
    group.add(new Text({ x: 0, y: previewHeight + 38, width: PAGE_CARD_WIDTH - 28, text: options.copied ? '已复制' : page.path, fill: '#969b9f', fontFamily: 'DM Mono', fontSize: 10, textWrap: 'none', textOverflow: 'ellipsis', cursor: 'pointer' }))
    group.add(new Text({ x: PAGE_CARD_WIDTH - 20, y: previewHeight + 36, width: 20, text: '↗', fill: '#6f7478', fontSize: 14, textAlign: 'right', cursor: 'pointer' }))
  }
  return group
}

export interface PageDeckOptions {
  x: number
  y: number
  previewHeight: number
  label: string
  count: number
  layerPages: PageFlowPage[]
  createLayer(page: PageFlowPage, x: number, y: number): Group
}

export function createPageDeckGroup(options: PageDeckOptions) {
  const group = new Group({ x: options.x, y: options.y, hittable: false })
  ;[...options.layerPages].reverse().forEach((page, index) => {
    const layer = options.layerPages.length - index - 1
    const card = options.createLayer(page, layer * 7, -layer * 7)
    card.opacity = Math.max(0.36, 1 - layer * 0.16)
    group.add(card)
  })
  group.add(new Text({ x: 0, y: options.previewHeight + 12, width: PAGE_CARD_WIDTH, text: `${options.label} · ${options.count}`, fill: '#3f4347', fontSize: 13, fontWeight: 700, textWrap: 'none', textOverflow: 'ellipsis', cursor: 'default' }))
  return group
}
