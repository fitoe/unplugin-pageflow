import type { PageFlowApiRequest, PageFlowBrowserRuntimeEvent, PageFlowDiagnostic, PageFlowPageSnapshot } from '@pageflow/core/types'

export const SOURCE = 'pageflow-chrome-extension'

export type PageSnapshot = PageFlowPageSnapshot
export type ApiRequest = PageFlowApiRequest
export type Diagnostic = PageFlowDiagnostic
export type RuntimeEvent = PageFlowBrowserRuntimeEvent
export type ExtensionMessage =
  | { type: 'pageflow:get-state' }
  | { type: 'pageflow:scan' }
  | { type: 'pageflow:highlight'; selector: string }
  | { type: 'pageflow:capture'; tabId: number }
  | { type: 'pageflow:runtime'; event: RuntimeEvent }
