import type { PageFlowApiResult, PageFlowDiagnostic, PageFlowLink } from '../shared/types'
import {
  PAGEFLOW_API_RESULT_MESSAGE,
  PAGEFLOW_DIAGNOSTICS_RESULT_MESSAGE,
  PAGEFLOW_ESCAPE_MESSAGE,
  PAGEFLOW_HOTSPOT_HOVER_MESSAGE,
  PAGEFLOW_NAVIGATE_MESSAGE,
  PAGEFLOW_PAGE_REPORTED_MESSAGE,
  PAGEFLOW_SCAN_RESULT_MESSAGE,
  PAGEFLOW_XPATH_SELECTED_MESSAGE,
} from '../shared/protocol'

export type PreviewMessage =
  | { type: 'api-result'; result: PageFlowApiResult }
  | { type: 'page-reported'; path?: string }
  | { type: 'hotspot-hover'; targets: string[]; hotspot?: { centerX: number; centerY: number } }
  | { type: 'scan-result'; path: string; links: PageFlowLink[] }
  | { type: 'diagnostics-result'; path: string; diagnostics: PageFlowDiagnostic[] }
  | { type: 'escape' }
  | { type: 'navigate'; to: string; location?: string; hotspot: boolean }
  | { type: 'xpath-selected'; xpath: string }

export function decodePreviewMessage(data: unknown): PreviewMessage | undefined {
  if (!data || typeof data !== 'object') return
  const message = data as Record<string, any>
  if (message.type === PAGEFLOW_API_RESULT_MESSAGE) {
    if (!message.result || !Array.isArray(message.result.fields)) return
    return { type: 'api-result', result: message.result as PageFlowApiResult }
  }
  if (message.type === PAGEFLOW_PAGE_REPORTED_MESSAGE) return {
    type: 'page-reported',
    path: typeof message.path === 'string' ? message.path : undefined,
  }
  if (message.type === PAGEFLOW_ESCAPE_MESSAGE) return { type: 'escape' }
  if (message.type === PAGEFLOW_XPATH_SELECTED_MESSAGE && typeof message.xpath === 'string' && message.xpath)
    return { type: 'xpath-selected', xpath: message.xpath }
  if (message.type === PAGEFLOW_HOTSPOT_HOVER_MESSAGE) {
    const targets = Array.isArray(message.targets)
      ? message.targets.filter((target: unknown): target is string => typeof target === 'string')
      : []
    const hotspot = message.hotspot
    return {
      type: 'hotspot-hover',
      targets,
      hotspot: Number.isFinite(hotspot?.centerX) && Number.isFinite(hotspot?.centerY)
        ? { centerX: hotspot.centerX, centerY: hotspot.centerY }
        : undefined,
    }
  }
  if (message.type === PAGEFLOW_SCAN_RESULT_MESSAGE) {
    if (typeof message.page?.path !== 'string') return
    return {
      type: 'scan-result',
      path: message.page.path,
      links: Array.isArray(message.page.links) ? message.page.links : [],
    }
  }
  if (message.type === PAGEFLOW_DIAGNOSTICS_RESULT_MESSAGE) {
    if (typeof message.path !== 'string' || !Array.isArray(message.diagnostics)) return
    const diagnostics = message.diagnostics.filter((item: unknown): item is PageFlowDiagnostic => {
      if (!item || typeof item !== 'object') return false
      const diagnostic = item as Record<string, unknown>
      return typeof diagnostic.id === 'string'
        && typeof diagnostic.ruleId === 'string'
        && typeof diagnostic.title === 'string'
        && typeof diagnostic.description === 'string'
        && ['error', 'warning', 'suggestion'].includes(String(diagnostic.severity))
    })
    return { type: 'diagnostics-result', path: message.path, diagnostics }
  }
  if (message.type === PAGEFLOW_NAVIGATE_MESSAGE) {
    if (typeof message.to !== 'string') return
    return {
      type: 'navigate',
      to: message.to,
      location: typeof message.location === 'string' && message.location ? message.location : undefined,
      hotspot: message.interaction === 'hotspot',
    }
  }
}
