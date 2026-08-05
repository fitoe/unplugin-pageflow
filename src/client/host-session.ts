import type { PageFlowHost, PageFlowHostState } from '../../packages/pageflow-core/src/host'
import { loadPageFlowCanvas } from '../../packages/pageflow-core/src/host-storage'
import type { PageFlowApiField, PageFlowApiRequest, PageFlowBrowserRuntimeEvent } from '../../packages/pageflow-core/src/types'

export interface PageFlowHostSessionCallbacks {
  onState(state: PageFlowHostState): void
  onRequest(request: PageFlowApiRequest & { fields?: PageFlowApiField[] }): void
  onDiagnostics(diagnostics: PageFlowHostState['diagnostics']): void
}

export async function startPageFlowHostSession(host: PageFlowHost, callbacks: PageFlowHostSessionCallbacks) {
  const state = await host.loadState()
  const origin = new URL(state.currentUrl).origin
  const storage = await loadPageFlowCanvas<Record<string, unknown>>(host, origin) ?? {}
  const handleEvent = (event: PageFlowBrowserRuntimeEvent) => {
    if (event.kind === 'request') {
      callbacks.onRequest(event.request)
      return
    }
    if (event.kind === 'diagnostics') {
      callbacks.onDiagnostics(event.diagnostics)
      return
    }
    void host.loadState().then(callbacks.onState)
  }
  return { state, origin, storage, stop: host.subscribe(handleEvent) }
}
