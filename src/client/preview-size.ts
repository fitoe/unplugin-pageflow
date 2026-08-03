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
  let detected = viewport
  let detectedArea = viewport.width * viewport.height
  for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
    const width = element.clientWidth
    const height = element.clientHeight
    if (!width || !height || (width <= viewport.width && height <= viewport.height)) continue
    const transform = document.defaultView?.getComputedStyle(element).transform
    if (!transform || transform === 'none') continue
    const rect = element.getBoundingClientRect()
    if (rect.width > viewport.width + 2 || rect.height > viewport.height + 2) continue
    const scaleX = rect.width / width
    const scaleY = rect.height / height
    if (scaleX >= 0.99 || scaleY >= 0.99 || Math.abs(scaleX - scaleY) > 0.02) continue
    const area = width * height
    if (area > detectedArea) {
      detected = { width, height }
      detectedArea = area
    }
  }
  return detected
}
