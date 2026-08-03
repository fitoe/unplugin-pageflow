import type { PageFlowBrowserRuntimeEvent } from './types'

export interface PageFlowHostState {
  currentUrl: string
  pages: Array<{ url: string; title: string; updatedAt: number }>
  edges: Array<{ id: string; from: string; to: string; occurrences: number }>
  requests: Array<{ id: string; method: string; url: string; status: number; duration: number; occurredAt?: number; occurrences?: number; body?: unknown }>
  diagnostics: Array<{ id: string; ruleId: string; severity: 'error' | 'warning' | 'suggestion'; category: 'accessibility' | 'visual' | 'interaction'; title: string; description: string; selector?: string }>
}

export interface PageFlowHost {
  readonly sourceId: string
  loadState(): Promise<PageFlowHostState>
  navigate(url: string): Promise<void>
  scan(): Promise<void>
  highlight(selector: string): Promise<void>
  capture(): Promise<string>
  loadStorage<T>(key: string): Promise<T | undefined>
  saveStorage(key: string, value: unknown): Promise<void>
  removeStorage(key: string): Promise<void>
  subscribe(listener: (event: PageFlowBrowserRuntimeEvent) => void): () => void
}
