import html2canvas from 'html2canvas-pro'
import { domToCanvas, type Options as ModernScreenshotOptions } from 'modern-screenshot'
import type { PageFlowThumbnailRecord, ResolvedPageFlowOptions } from '../shared/types'
import { PAGE_CARD_WIDTH } from './layout'
import { boundedPreviewDocumentHeight, materializeMaskedIcons } from './snapshot'
import {
  canvasToBlob,
  extractThumbnailTile,
  resizeThumbnail,
  saveThumbnail,
  thumbnailSlot,
  thumbnailTileCount,
  type PageFlowPreviewMode,
  PAGEFLOW_THUMBNAIL_TILE_HEIGHT,
} from './thumbnails'

interface SnapshotCanvas {
  width: number
  height: number
}

interface SnapshotCaptureDependencies {
  render(target: HTMLElement, options: Record<string, unknown>): Promise<SnapshotCanvas>
  resize(source: SnapshotCanvas, width: number): SnapshotCanvas
  tileCount(source: SnapshotCanvas): number
  extractTile(source: SnapshotCanvas, index: number): SnapshotCanvas
  encode(source: SnapshotCanvas, quality: number): Promise<Blob>
  save(config: ResolvedPageFlowOptions, record: Omit<PageFlowThumbnailRecord, 'mimeType' | 'file' | 'updatedAt'>, blob: Blob): Promise<PageFlowThumbnailRecord>
}

interface SnapshotRenderers {
  primary(target: HTMLElement, options: ModernScreenshotOptions): Promise<HTMLCanvasElement>
  fallback(target: HTMLElement, options: Record<string, unknown>): Promise<HTMLCanvasElement>
}

export async function renderSnapshotCanvas(
  target: HTMLElement,
  options: Record<string, unknown>,
  renderers: SnapshotRenderers = { primary: domToCanvas, fallback: html2canvas },
) {
  try {
    return await renderers.primary(target, {
      backgroundColor: options.backgroundColor as string,
      height: options.height as number,
      onCloneNode: clone => {
        if (clone.nodeType === 1) materializeMaskedIcons(clone as Element)
      },
      scale: options.scale as number,
      width: options.width as number,
    })
  } catch {
    return renderers.fallback(target, options)
  }
}

const defaultDependencies: SnapshotCaptureDependencies = {
  render: renderSnapshotCanvas,
  resize: (source, width) => resizeThumbnail(source as HTMLCanvasElement, width),
  tileCount: source => thumbnailTileCount(source as HTMLCanvasElement),
  extractTile: (source, index) => extractThumbnailTile(source as HTMLCanvasElement, index),
  encode: (source, quality) => canvasToBlob(source as HTMLCanvasElement, quality),
  save: saveThumbnail,
}

export function snapshotCaptureTarget(body: HTMLElement) {
  return body.querySelector<HTMLElement>('.home-page.pageflow-preview')
    ?? body.querySelector<HTMLElement>('uni-page-body > *')
    ?? (body.firstElementChild instanceof HTMLElement ? body.firstElementChild : body)
}

export interface CapturePageThumbnailsOptions {
  config: ResolvedPageFlowOptions
  document: Document
  body: HTMLElement
  pageId: string
  previewMode: PageFlowPreviewMode
  mode: { width: number; height: number }
  revision: string
  highResolution: boolean
}

export async function capturePageThumbnails(
  options: CapturePageThumbnailsOptions,
  dependencies: SnapshotCaptureDependencies = defaultDependencies,
) {
  const fullHeight = options.previewMode === 'mobile'
    ? options.mode.height
    : boundedPreviewDocumentHeight(options.document, options.mode.height)
  const snapshot = await dependencies.render(snapshotCaptureTarget(options.body), {
    backgroundColor: '#fff',
    height: fullHeight,
    logging: false,
    onclone: materializeMaskedIcons,
    scale: options.highResolution ? 2 : PAGE_CARD_WIDTH / options.mode.width,
    scrollX: 0,
    scrollY: 0,
    useCORS: true,
    width: options.mode.width,
    windowHeight: options.mode.height,
    windowWidth: options.mode.width,
  })
  const records: PageFlowThumbnailRecord[] = []
  const displayScale = PAGE_CARD_WIDTH / snapshot.width
  const displayHeight = Math.round(snapshot.height * displayScale)
  const compact = dependencies.resize(snapshot, 96)
  try {
    records.push(await dependencies.save(options.config, {
      slot: thumbnailSlot(options.pageId, options.previewMode, 'compact'),
      revision: options.revision,
      width: compact.width,
      height: displayHeight,
      pageHeight: displayHeight,
    }, await dependencies.encode(compact, 0.76)))
  } finally {
    compact.width = 0
    compact.height = 0
  }
  try {
    const tileCount = dependencies.tileCount(snapshot)
    for (let tileIndex = tileCount - 1; tileIndex >= 0; tileIndex--) {
      const tile = dependencies.extractTile(snapshot, tileIndex)
      try {
        records.push(await dependencies.save(options.config, {
          slot: thumbnailSlot(options.pageId, options.previewMode, 'full', tileIndex),
          revision: options.revision,
          width: tile.width,
          height: Math.round(tile.height * displayScale),
          pageHeight: displayHeight,
          tileCount,
          tileIndex,
          tileTop: Math.round(tileIndex * PAGEFLOW_THUMBNAIL_TILE_HEIGHT * displayScale),
        }, await dependencies.encode(tile, 0.9)))
      } finally {
        tile.width = 0
        tile.height = 0
      }
    }
  } finally {
    snapshot.width = 0
    snapshot.height = 0
  }
  return records
}
