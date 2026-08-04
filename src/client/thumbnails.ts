import type {
  PageFlowThumbnailManifest,
  PageFlowPage,
  PageFlowThumbnailRecord,
  ResolvedPageFlowOptions,
} from '../shared/types'
import type { CanvasTransform, ViewportSize } from './layout'

export type PageFlowPreviewMode = 'mobile' | 'tablet' | 'pc'
export type PageFlowThumbnailTier = 'compact' | 'full'
export const PAGEFLOW_THUMBNAIL_TILE_HEIGHT = 512
export const PAGEFLOW_MAX_SINGLE_THUMBNAIL_HEIGHT = 4096
const PAGEFLOW_THUMBNAIL_CAPTURE_VERSION = 20
export const PAGEFLOW_FULL_THUMBNAIL_MAX_WIDTH = 960

export function thumbnailTierForZoom(zoomPercent: number): PageFlowThumbnailTier {
  return zoomPercent < 200 ? 'compact' : 'full'
}

export function thumbnailSlot(
  pageId: string,
  mode: PageFlowPreviewMode,
  tier: PageFlowThumbnailTier,
  tileIndex?: number,
) {
  return tileIndex == null ? `${mode}:${tier}:${pageId}` : `${mode}:${tier}:${pageId}:tile:${tileIndex}`
}

export function thumbnailRevision(page: PageFlowPage) {
  const contentRevision = page.revision && page.revision !== page.path ? page.revision : undefined
  return `${PAGEFLOW_THUMBNAIL_CAPTURE_VERSION}:${contentRevision ?? page.sourceFile ?? page.id}`
}

export function thumbnailPageKey(page: PageFlowPage, pages: PageFlowPage[] = []) {
  if (!page.sourceFile) return page.id
  const sourceFile = page.sourceFile.replaceAll('\\', '/')
  const sharedSource = pages.some(item => item.id !== page.id && item.sourceFile?.replaceAll('\\', '/') === sourceFile)
  return sharedSource ? `source:${sourceFile}:${page.id}` : `source:${sourceFile}`
}

export async function fetchThumbnailManifest(config: ResolvedPageFlowOptions) {
  const response = await fetch(`${config.previewPath}api/thumbnails`)
  if (!response.ok) throw new Error(`Failed to load thumbnail manifest: ${response.status}`)
  return response.json() as Promise<PageFlowThumbnailManifest>
}

export function thumbnailUrl(
  config: ResolvedPageFlowOptions,
  record: PageFlowThumbnailRecord,
) {
  return `${config.previewPath}api/thumbnail?slot=${encodeURIComponent(record.slot)}&v=${encodeURIComponent(record.revision)}&updated=${record.updatedAt}`
}

export async function saveThumbnail(
  config: ResolvedPageFlowOptions,
  record: Pick<PageFlowThumbnailRecord, 'slot' | 'revision' | 'width' | 'height'>
    & Partial<Pick<PageFlowThumbnailRecord, 'pageHeight' | 'tileCount' | 'tileIndex' | 'tileTop'>>,
  image: Blob,
) {
  const query = new URLSearchParams({
    slot: record.slot,
    revision: record.revision,
    width: String(record.width),
    height: String(record.height),
  })
  for (const key of ['pageHeight', 'tileCount', 'tileIndex', 'tileTop'] as const) {
    const value = record[key]
    if (value != null) query.set(key, String(value))
  }
  const response = await fetch(`${config.previewPath}api/thumbnail?${query}`, {
    method: 'POST',
    headers: { 'Content-Type': image.type },
    body: image,
  })
  if (!response.ok) throw new Error(`Failed to save thumbnail: ${response.status}`)
  return response.json() as Promise<PageFlowThumbnailRecord>
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.9) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('Failed to encode thumbnail')),
    'image/webp',
    quality,
  ))
}

export function resizeThumbnail(source: HTMLCanvasElement, width: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.max(1, Math.round(source.height * width / source.width))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to resize thumbnail')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function thumbnailTileCount(source: HTMLCanvasElement, tileHeight = PAGEFLOW_THUMBNAIL_TILE_HEIGHT) {
  return Math.max(1, Math.ceil(source.height / tileHeight))
}

export function extractThumbnailTile(
  source: HTMLCanvasElement,
  tileIndex: number,
  tileHeight = PAGEFLOW_THUMBNAIL_TILE_HEIGHT,
) {
  const top = tileIndex * tileHeight
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = Math.min(tileHeight, source.height - top)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create thumbnail tile')
  context.drawImage(source, 0, top, source.width, canvas.height, 0, 0, source.width, canvas.height)
  return canvas
}

export function fullThumbnailTiles(
  manifest: PageFlowThumbnailManifest,
  pageId: string,
  mode: PageFlowPreviewMode,
) {
  const root = manifest[thumbnailSlot(pageId, mode, 'full', 0)]
  const single = manifest[thumbnailSlot(pageId, mode, 'full')]
  if (single && (!root || single.updatedAt >= root.updatedAt)) return [single]
  if (root?.tileCount) {
    const records = Array.from({ length: root.tileCount }, (_, index) =>
      manifest[thumbnailSlot(pageId, mode, 'full', index)],
    )
    if (records.every(Boolean)) return records as PageFlowThumbnailRecord[]
  }
  return single ? [single] : []
}

export function visibleThumbnailTiles(
  records: PageFlowThumbnailRecord[],
  pageWorldY: number,
  viewport: ViewportSize,
  transform: CanvasTransform,
  margin = 240,
) {
  return records.filter(record => {
    const tileTop = record.tileTop ?? 0
    const tileHeight = record.tileCount ? record.height : record.pageHeight ?? record.height
    const top = transform.y + (pageWorldY + tileTop) * transform.scaleY
    const bottom = top + tileHeight * transform.scaleY
    return bottom >= -margin && top <= viewport.height + margin
  })
}
