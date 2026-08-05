import type { PageFlowApiRequest, PageFlowBrowserRuntimeEvent, PageFlowDiagnostic, PageFlowPageSnapshot } from '@pageflow/core/types'

export const SOURCE = 'pageflow-chrome-extension'

export type PageSnapshot = PageFlowPageSnapshot
export type ApiRequest = PageFlowApiRequest
export type Diagnostic = PageFlowDiagnostic
export type RuntimeEvent = PageFlowBrowserRuntimeEvent
export type ExtensionMessage =
  | { type: 'pageflow:get-state' }
  | { type: 'pageflow:get-metrics' }
  | { type: 'pageflow:get-capture-size'; viewport: { width: number; height: number } }
  | { type: 'pageflow:scan' }
  | { type: 'pageflow:highlight'; selector: string }
  | { type: 'pageflow:capture'; tabId: number }
  | { type: 'pageflow:capture-page'; tabId: number; url: string; viewport: { width: number; height: number } }
  | { type: 'pageflow:start-session'; tabId: number }
  | { type: 'pageflow:stop-session'; tabId: number }
  | { type: 'pageflow:network-request'; request: PageFlowApiRequest }
  | { type: 'pageflow:network-mode'; mode: 'cdp' | 'injected' }
  | { type: 'pageflow:runtime'; event: RuntimeEvent }
