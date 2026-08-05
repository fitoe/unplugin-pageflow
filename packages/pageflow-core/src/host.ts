import type { PageFlowApiField, PageFlowApiRequest, PageFlowBrowserRuntimeEvent } from './types'

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
  capture(): Promise<string | PageFlowHostCapture>
  previewSize?(): Promise<{ width: number; height: number }>
  capturePage?(url: string, viewport: { width: number; height: number }): Promise<string | PageFlowHostCapture>
  loadStorage<T>(key: string): Promise<T | undefined>
  saveStorage(key: string, value: unknown): Promise<void>
  removeStorage(key: string): Promise<void>
  subscribe(listener: (event: PageFlowBrowserRuntimeEvent) => void): () => void
  publish?(event: PageFlowBrowserRuntimeEvent): void
}
