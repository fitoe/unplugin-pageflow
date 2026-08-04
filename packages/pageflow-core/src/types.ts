export interface PageFlowApiField {
  path: string
  value: string | number | boolean | null
  used: boolean
}

export interface PageFlowApiRequest {
  id: string
  method: string
  url: string
  status: number
  duration: number
  occurredAt?: number
  responseSize?: number
  contentType?: string
  occurrences?: number
  lastIntervalMs?: number
  body?: unknown
}

export interface PageFlowApiResult extends PageFlowApiRequest {
  fields: PageFlowApiField[]
}

export type PageFlowDiagnosticSeverity = 'error' | 'warning' | 'suggestion'
export type PageFlowDiagnosticCategory = 'accessibility' | 'visual' | 'interaction'

export interface PageFlowDiagnostic {
  id: string
  ruleId: string
  severity: PageFlowDiagnosticSeverity
  category: PageFlowDiagnosticCategory
  title: string
  description: string
  selector?: string
  targetLabel?: string
  bounds?: { x: number, y: number, width: number, height: number }
  measured?: Record<string, string | number>
  source?: string
  navigation?: { method: string, target: string }
}

export interface PageFlowPageSnapshot {
  url: string
  routeKey?: string
  discovered?: boolean
  title: string
  updatedAt: number
}

export interface PageFlowNavigationEdge {
  id: string
  from: string
  to: string
  occurrences: number
  hotspot?: { centerX: number; centerY: number; width?: number; height?: number }
}

export type PageFlowBrowserRuntimeEvent =
  | { kind: 'page'; page: PageFlowPageSnapshot }
  | { kind: 'navigation'; edge: PageFlowNavigationEdge }
  | { kind: 'request'; request: PageFlowApiRequest }
  | { kind: 'diagnostics'; diagnostics: PageFlowDiagnostic[] }
