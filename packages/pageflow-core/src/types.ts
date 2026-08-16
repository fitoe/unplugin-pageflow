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

export type PageFlowFormControlKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'search'
  | 'number'
  | 'date'
  | 'datetime-local'
  | 'time'
  | 'select'
  | 'picker'
  | 'radio'
  | 'checkbox'

export type PageFlowFormValue = string | boolean

export interface PageFlowFormControlOption {
  value: string
  label: string
  disabled?: boolean
}

export interface PageFlowFormControlDescriptor {
  id: string
  identity: string
  selector: string
  label: string
  kind: PageFlowFormControlKind
  required: boolean
  value: PageFlowFormValue
  suggestedValue: PageFlowFormValue
  placeholder?: string
  min?: string
  max?: string
  step?: string
  maxLength?: number
  options?: PageFlowFormControlOption[]
}

export interface PageFlowFormScanResult {
  controls: PageFlowFormControlDescriptor[]
  skipped: {
    sensitive: number
    unavailable: number
    unsupported: number
  }
}

export interface PageFlowFormFillResult {
  applied: string[]
  skipped: Array<{ id: string, reason: string }>
  missing: string[]
  errors: Array<{ id: string, message: string }>
  canUndo: boolean
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
  | { kind: 'page-remove'; url: string }
  | { kind: 'navigation'; edge: PageFlowNavigationEdge }
  | { kind: 'request'; request: PageFlowApiRequest }
  | { kind: 'diagnostics'; diagnostics: PageFlowDiagnostic[] }
