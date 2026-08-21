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
  scale?: number
  highlighted?: boolean
  orphan?: boolean
  dark?: boolean
  previewStatus?: string
}

export function setPageCardShadow(group: Group, highlighted: boolean, capturePulse?: number) {
  const background = group.children[0]
  if (!(background instanceof Rect)) return false
  background.set({
    shadow: capturePulse == null
      ? highlighted
        ? { x: 0, y: 16, blur: 42, color: '#090a0b78' }
        : { x: 0, y: 8, blur: 20, color: '#090a0b40' }
      : { x: 0, y: 12, blur: 24 + capturePulse * 22, color: `rgba(59, 130, 246, ${0.28 + capturePulse * 0.3})` },
  })
  return true
}

export function createPageCardGroup(options: PageCardOptions) {
  const { page, x, y, previewHeight, tiles, thumbnailSource } = options
  const primary = options.dark ? '#f5f5f5' : '#262626'
  const secondary = options.dark ? '#a3a3a3' : '#737373'
  const group = new Group({ x, y, scaleX: options.scale ?? 1, scaleY: options.scale ?? 1, hittable: false })
  group.add(new Rect({
    width: PAGE_CARD_WIDTH,
    height: previewHeight,
    fill: options.dark ? '#171717' : '#fff',
    stroke: options.orphan ? (options.dark ? '#737373' : '#a3a3a3') : undefined,
    strokeWidth: options.orphan ? 2 : 0,
    strokeScaleFixed: true,
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
    group.add(new Text({ x: 16, y: Math.max(16, previewHeight / 2 - 34), width: PAGE_CARD_WIDTH - 32, text: options.previewStatus ?? page.title, fill: primary, fontSize: options.previewStatus ? 12 : 18, fontWeight: 700, textAlign: options.previewStatus ? 'center' : 'left', textWrap: 'none', textOverflow: 'ellipsis' }))
    group.add(new Text({ x: 16, y: Math.max(38, previewHeight / 2 - 8), width: PAGE_CARD_WIDTH - 32, text: options.previewStatus ? '聚焦页面后可查看实时预览' : page.path, fill: secondary, fontFamily: 'ui-monospace, Cascadia Code, SFMono-Regular, Consolas, monospace', fontSize: 9, textAlign: options.previewStatus ? 'center' : 'left', textWrap: 'none', textOverflow: 'ellipsis' }))
  }
  return group
}

export interface PageDeckOptions {
  x: number
  y: number
  previewHeight: number
  label: string
  routePath: string
  count: number
  layerPages: PageFlowPage[]
  createLayer(page: PageFlowPage, x: number, y: number): Group
  dark?: boolean
}

export function createPageDeckGroup(options: PageDeckOptions) {
  const secondary = options.dark ? '#a3a3a3' : '#737373'
  const group = new Group({ x: options.x, y: options.y, hittable: false })
  ;[...options.layerPages].reverse().forEach((page, index) => {
    const layer = options.layerPages.length - index - 1
    const card = options.createLayer(page, layer * 7, -layer * 7)
    card.opacity = Math.max(0.36, 1 - layer * 0.16)
    group.add(card)
  })
  group.add(new Text({ x: 0, y: options.previewHeight + 12, width: PAGE_CARD_WIDTH, text: `${options.label} · ${options.count}`, fill: options.dark ? '#f5f5f5' : '#262626', fontSize: 13, fontWeight: 700, textWrap: 'none', textOverflow: 'ellipsis', cursor: 'default' }))
  group.add(new Text({ x: 0, y: options.previewHeight + 32, width: PAGE_CARD_WIDTH, text: options.routePath, fill: secondary, fontFamily: 'ui-monospace, Cascadia Code, SFMono-Regular, Consolas, monospace', fontSize: 9, textWrap: 'none', textOverflow: 'ellipsis', cursor: 'default' }))
  return group
}
