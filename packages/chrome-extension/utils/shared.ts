import type { PageFlowApiRequest, PageFlowBrowserRuntimeEvent, PageFlowDiagnostic, PageFlowFormValue, PageFlowPageSnapshot } from '@pageflow/core/types'

export const SOURCE = 'pageflow-chrome-extension'

export type PageSnapshot = PageFlowPageSnapshot
export type ApiRequest = PageFlowApiRequest
export type Diagnostic = PageFlowDiagnostic
export type RuntimeEvent = PageFlowBrowserRuntimeEvent
export type ExtensionMessage =
  | { type: 'pageflow:get-state' }
  | { type: 'pageflow:get-config-url' }
  | { type: 'pageflow:get-metrics' }
  | { type: 'pageflow:get-capture-size'; viewport: { width: number; height: number } }
  | { type: 'pageflow:scan' }
  | { type: 'pageflow:highlight'; selector: string }
  | { type: 'pageflow:form-scan' }
  | { type: 'pageflow:form-fill'; values: Record<string, PageFlowFormValue> }
  | { type: 'pageflow:form-undo' }
  | { type: 'pageflow:capture'; tabId: number }
  | { type: 'pageflow:capture-page'; tabId: number; url: string; viewport: { width: number; height: number } }
  | { type: 'pageflow:start-session'; tabId: number }
  | { type: 'pageflow:stop-session'; tabId: number }
  | { type: 'pageflow:network-request'; request: PageFlowApiRequest }
  | { type: 'pageflow:network-mode'; mode: 'cdp' | 'injected' }
  | { type: 'pageflow:runtime'; event: RuntimeEvent }
