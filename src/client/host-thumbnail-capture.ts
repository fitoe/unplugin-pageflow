import type { PageFlowHost } from '../../packages/pageflow-core/src/host'
import { savePageFlowCanvas } from '../../packages/pageflow-core/src/host-storage'
import type { PageFlowPage } from '../shared/types'
import { canvasToBlob } from './thumbnails'
import type { StoredHostThumbnail } from './host-thumbnails'

export async function encodeHostThumbnail(captured: string, width: number) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image()
    next.onload = () => resolve(next)
    next.onerror = reject
    next.src = captured
  })
  const height = Math.max(1, Math.round(image.naturalHeight * width / image.naturalWidth))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('PageFlow failed to encode host thumbnail')
  context.drawImage(image, 0, 0, width, height)
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('PageFlow failed to read host thumbnail'))
    void canvasToBlob(canvas).then(blob => reader.readAsDataURL(blob), reject)
  })
  return { source, width, height }
}

export async function persistHostThumbnails(
  host: PageFlowHost,
  origin: string,
  storage: Record<string, unknown>,
  thumbnails: StoredHostThumbnail[],
) {
  const next = { ...storage, thumbnails, updatedAt: Date.now() }
  await savePageFlowCanvas(host, origin, next)
  return next
}

export function nextMissingHostThumbnail(
  pages: PageFlowPage[],
  options: {
    activePageId: string
    attemptedIds: Set<string>
    failedIds: Set<string>
    pageUrls: Map<string, string>
    isCurrent: (page: PageFlowPage) => boolean
  },
) {
  return pages.find(page => page.id !== options.activePageId
    && !options.attemptedIds.has(page.id)
    && !options.failedIds.has(page.id)
    && !options.isCurrent(page)
    && options.pageUrls.has(page.id))
}
