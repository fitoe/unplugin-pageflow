export interface PreviewSize {
  width: number
  height: number
}

export function parsePreviewSize(value: string | null): PreviewSize | undefined {
  if (!value) return
  try {
    const size = JSON.parse(value) as Partial<PreviewSize>
    if (!Number.isFinite(size.width) || !Number.isFinite(size.height)
      || size.width! < 1 || size.height! < 1 || size.width! > 10_000 || size.height! > 10_000)
      return
    return { width: Math.round(size.width!), height: Math.round(size.height!) }
  } catch {
    return
  }
}

export function detectScaledPreviewSize(document: Document, viewport: PreviewSize): PreviewSize {
  return detectPageFlowPreviewSize(document, viewport)
}
import { detectPageFlowPreviewSize } from '../../packages/pageflow-runtime/src'
