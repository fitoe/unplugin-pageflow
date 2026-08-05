import type { PageFlowThumbnailRecord } from '../shared/types'
import type { PageFlowPreviewMode } from './thumbnails'
import { thumbnailSlot } from './thumbnails'

export interface StoredHostThumbnail {
  pageId: string
  mode: PageFlowPreviewMode
  revision: string
  source: string
  width: number
  height: number
  pageHeight: number
  updatedAt: number
}

export function parseStoredHostThumbnails(value: unknown): StoredHostThumbnail[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is StoredHostThumbnail => Boolean(item)
    && typeof item.pageId === 'string'
    && ['mobile', 'tablet', 'pc'].includes(item.mode)
    && typeof item.revision === 'string'
    && typeof item.source === 'string'
    && typeof item.width === 'number'
    && typeof item.height === 'number'
    && typeof item.pageHeight === 'number'
    && typeof item.updatedAt === 'number')
}

export function upsertStoredHostThumbnail(items: StoredHostThumbnail[], next: StoredHostThumbnail) {
  return [...items.filter(item => item.pageId !== next.pageId || item.mode !== next.mode), next]
}

export function storedHostThumbnailRecords(item: StoredHostThumbnail): PageFlowThumbnailRecord[] {
  return (['compact', 'full'] as const).map(tier => ({
    slot: thumbnailSlot(item.pageId, item.mode, tier),
    revision: item.revision,
    width: item.width,
    height: item.height,
    pageHeight: item.pageHeight,
    mimeType: 'image/webp',
    file: '',
    updatedAt: item.updatedAt,
  }))
}
