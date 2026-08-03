import type { PageFlowDiagnostic, PageFlowLink } from '../shared/types'
import { PAGE_CARD_WIDTH, type CanvasTransform } from './layout'

export interface DiagnosticEvidenceRecord {
  source: string
  sourceWidth: number
  height: number
  tileTop?: number
}

export interface DiagnosticEvidencePlan {
  width: number
  height: number
  layers: Array<{ source: string, left: number, top: number, width: number, height: number }>
  marker: { left: number, top: number, width: number, height: number }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

export function navigationDiagnosticBounds(
  diagnostic: PageFlowDiagnostic,
  links: PageFlowLink[],
  viewport: { width: number, height: number },
  targetSize = 44,
) {
  const target = diagnostic.navigation?.target.split(/[?#]/, 1)[0]
  if (!target) return
  const candidates = links.filter(link => link.to === target && link.hotspot)
  if (!candidates.length) return
  const targetLabel = diagnostic.targetLabel?.match(/[“"]([^”"]+)[”"]/)?.[1]
  const link = candidates.find(item => targetLabel && item.label.includes(targetLabel)) ?? candidates[0]
  if (!link?.hotspot) return
  return {
    x: clamp(link.hotspot.centerX * viewport.width - targetSize / 2, 0, Math.max(0, viewport.width - targetSize)),
    y: clamp(link.hotspot.centerY * viewport.height - targetSize / 2, 0, Math.max(0, viewport.height - targetSize)),
    width: Math.min(targetSize, viewport.width),
    height: Math.min(targetSize, viewport.height),
  }
}

export function centerDiagnosticTransform(
  bounds: NonNullable<PageFlowDiagnostic['bounds']>,
  pagePosition: [number, number],
  pageViewportWidth: number,
  canvasViewport: { width: number, height: number },
  scale: number,
): CanvasTransform {
  const pageScale = PAGE_CARD_WIDTH / pageViewportWidth
  const centerX = pagePosition[0] + (bounds.x + bounds.width / 2) * pageScale
  const centerY = pagePosition[1] + (bounds.y + bounds.height / 2) * pageScale
  return {
    x: canvasViewport.width / 2 - centerX * scale,
    y: canvasViewport.height / 2 - centerY * scale,
    scaleX: scale,
    scaleY: scale,
  }
}

export function planDiagnosticEvidence(
  bounds: NonNullable<PageFlowDiagnostic['bounds']>,
  records: DiagnosticEvidenceRecord[],
  viewportWidth: number,
  maximumWidth = 300,
  maximumHeight = 220,
): DiagnosticEvidencePlan | undefined {
  if (!records.length || viewportWidth <= 0) return
  const pageHeight = Math.max(...records.map(record => (record.tileTop ?? 0) + record.height))
  if (pageHeight <= 0) return
  const pageScale = PAGE_CARD_WIDTH / viewportWidth
  const element = {
    x: bounds.x * pageScale,
    y: bounds.y * pageScale,
    width: Math.max(2, bounds.width * pageScale),
    height: Math.max(2, bounds.height * pageScale),
  }
  const cropWidth = Math.min(PAGE_CARD_WIDTH, 180, element.width + 8)
  const cropHeight = Math.min(pageHeight, 104, element.height + 8)
  const cropLeft = clamp(element.x + element.width / 2 - cropWidth / 2, 0, PAGE_CARD_WIDTH - cropWidth)
  const cropTop = clamp(element.y + element.height / 2 - cropHeight / 2, 0, pageHeight - cropHeight)
  const displayScale = Math.min(maximumWidth / cropWidth, maximumHeight / cropHeight)
  const layers = records
    .filter(record => (record.tileTop ?? 0) < cropTop + cropHeight && (record.tileTop ?? 0) + record.height > cropTop)
    .map((record) => {
      const sourceToPageScale = PAGE_CARD_WIDTH / record.sourceWidth
      return {
        source: record.source,
        left: -cropLeft * displayScale,
        top: ((record.tileTop ?? 0) - cropTop) * displayScale,
        width: record.sourceWidth * sourceToPageScale * displayScale,
        height: record.height * displayScale,
      }
    })
  if (!layers.length) return
  const markerLeft = clamp(element.x, cropLeft, cropLeft + cropWidth)
  const markerTop = clamp(element.y, cropTop, cropTop + cropHeight)
  const markerRight = clamp(element.x + element.width, cropLeft, cropLeft + cropWidth)
  const markerBottom = clamp(element.y + element.height, cropTop, cropTop + cropHeight)
  return {
    width: cropWidth * displayScale,
    height: cropHeight * displayScale,
    layers,
    marker: {
      left: (markerLeft - cropLeft) * displayScale,
      top: (markerTop - cropTop) * displayScale,
      width: Math.max(2, markerRight - markerLeft) * displayScale,
      height: Math.max(2, markerBottom - markerTop) * displayScale,
    },
  }
}
