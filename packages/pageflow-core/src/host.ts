import type { PageFlowApiField, PageFlowApiRequest, PageFlowBrowserRuntimeEvent, PageFlowFormFillResult, PageFlowFormScanResult, PageFlowFormValue } from './types.ts'

export interface PageFlowHostProjectConfig {
  loaded: boolean
  source?: string
  error?: string
  groupNames: Record<string, string>
  pageNames: Record<string, string>
  figmaPages?: Record<string, { url: string, label?: string, openMode?: 'desktop' | 'browser' }>
  canvasLayouts: Record<string, Record<string, [number, number]>>
}

export interface PageFlowHostState {
  currentUrl: string
  pages: Array<{ url: string; routeKey?: string; discovered?: boolean; title: string; updatedAt: number }>
  edges: Array<{ id: string; from: string; to: string; occurrences: number; hotspot?: { centerX: number; centerY: number; width?: number; height?: number } }>
  requests: Array<PageFlowApiRequest & { fields?: PageFlowApiField[] }>
  diagnostics: Array<{ id: string; ruleId: string; severity: 'error' | 'warning' | 'suggestion'; category: 'accessibility' | 'visual' | 'interaction'; title: string; description: string; selector?: string }>
}

export interface PageFlowHostCapture {
  source: string
  pageWidth?: number
  pageHeight?: number
}

export interface PageFlowHost {
  readonly sourceId: string
  loadState(): Promise<PageFlowHostState>
  navigate(url: string): Promise<void>
  scan(): Promise<void>
  highlight(selector: string): Promise<void>
  scanForm?(): Promise<PageFlowFormScanResult>
  fillForm?(values: Record<string, PageFlowFormValue>): Promise<PageFlowFormFillResult>
  undoFormFill?(): Promise<PageFlowFormFillResult>
  capture(): Promise<string | PageFlowHostCapture>
  previewSize?(): Promise<{ width: number; height: number }>
  capturePage?(url: string, viewport: { width: number; height: number }): Promise<string | PageFlowHostCapture>
  refreshProjectConfig?(): Promise<PageFlowHostProjectConfig>
  loadStorage<T>(key: string): Promise<T | undefined>
  saveStorage(key: string, value: unknown): Promise<void>
  removeStorage(key: string): Promise<void>
  subscribe(listener: (event: PageFlowBrowserRuntimeEvent) => void): () => void
  publish?(event: PageFlowBrowserRuntimeEvent): void
}
