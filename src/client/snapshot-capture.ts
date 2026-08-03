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
  PAGEFLOW_MAX_SINGLE_THUMBNAIL_HEIGHT,
  PAGEFLOW_THUMBNAIL_TILE_HEIGHT,
} from './thumbnails'

interface SnapshotCanvas {
  width: number
  height: number
}

export function hasMeaningfulSnapshotPixels(pixels: Uint8ClampedArray) {
  if (!pixels.length) return false
  const buckets = new Map<number, number>()
  let visible = 0
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3]
    if (alpha <= 16) continue
    visible++
    const bucket = (pixels[index] >> 4) << 12
      | (pixels[index + 1] >> 4) << 8
      | (pixels[index + 2] >> 4) << 4
      | (alpha >> 6)
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1)
  }
  if (visible < pixels.length / 4 * 0.02) return false
  const dominant = Math.max(0, ...buckets.values())
  return visible - dominant >= Math.max(2, Math.floor(visible * 0.01))
}

export function snapshotHasVisualContent(source: HTMLCanvasElement) {
  try {
    const sample = source.ownerDocument.createElement('canvas')
    sample.width = 32
    sample.height = 18
    const context = sample.getContext('2d', { willReadFrequently: true })
    if (!context) return true
    context.drawImage(source, 0, 0, sample.width, sample.height)
    return hasMeaningfulSnapshotPixels(context.getImageData(0, 0, sample.width, sample.height).data)
  } catch {
    return true
  }
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
}

export async function preserveCanvasFrames(target: HTMLElement) {
  const restores: Array<() => void> = []
  const decodes: Promise<unknown>[] = []
  target.querySelectorAll('canvas').forEach((source) => {
    const frame = source.ownerDocument.createElement('canvas')
    frame.width = source.width
    frame.height = source.height
    const context = frame.getContext('2d')
    if (!context) return
    try {
      context.drawImage(source, 0, 0)
      const dataUrl = frame.toDataURL()
      const image = source.ownerDocument.createElement('img')
      image.src = dataUrl
      image.width = source.width
      image.height = source.height
      image.className = source.className
      image.style.cssText = source.style.cssText
      const style = source.ownerDocument.defaultView?.getComputedStyle(source)
      if (style) Object.assign(image.style, {
        boxSizing: style.boxSizing,
        display: style.display,
        height: style.height,
        left: style.left,
        maxHeight: style.maxHeight,
        maxWidth: style.maxWidth,
        minHeight: style.minHeight,
        minWidth: style.minWidth,
        position: style.position,
        right: style.right,
        top: style.top,
        transform: style.transform,
        transformOrigin: style.transformOrigin,
        width: style.width,
      })
      source.replaceWith(image)
      restores.push(() => image.replaceWith(source))
      decodes.push(image.decode().catch(() => undefined))
    } catch {}
  })
  await Promise.all(decodes)
  return () => restores.forEach(restore => restore())
}

export async function renderSnapshotCanvas(
  target: HTMLElement,
  options: Record<string, unknown>,
  renderers: SnapshotRenderers = { primary: domToCanvas },
) {
  const restoreCanvasFrames = await preserveCanvasFrames(target)
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
  } finally {
    restoreCanvasFrames()
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

const SNAPSHOT_SCROLLBAR_STYLE_ID = 'unplugin-pageflow-snapshot-scrollbars'

export function hideSnapshotScrollbars(document: Document) {
  const style = document.createElement('style')
  style.id = SNAPSHOT_SCROLLBAR_STYLE_ID
  style.textContent = '* { scrollbar-width: none !important; } *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }'
  document.head.append(style)
  return () => style.remove()
}

export function snapshotCaptureTarget(body: HTMLElement) {
  return body
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
  const restoreScrollbars = hideSnapshotScrollbars(options.document)
  let snapshot: SnapshotCanvas
  try {
    snapshot = await dependencies.render(snapshotCaptureTarget(options.body), {
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
  } finally {
    restoreScrollbars()
  }
  if ('ownerDocument' in snapshot && !snapshotHasVisualContent(snapshot as HTMLCanvasElement)) {
    snapshot.width = 0
    snapshot.height = 0
    throw new Error('Snapshot is visually blank')
  }
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
    if (snapshot.height <= PAGEFLOW_MAX_SINGLE_THUMBNAIL_HEIGHT) {
      records.push(await dependencies.save(options.config, {
        slot: thumbnailSlot(options.pageId, options.previewMode, 'full'),
        revision: options.revision,
        width: snapshot.width,
        height: displayHeight,
        pageHeight: displayHeight,
      }, await dependencies.encode(snapshot, 0.9)))
    } else {
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
    }
  } finally {
    snapshot.width = 0
    snapshot.height = 0
  }
  return records
}
