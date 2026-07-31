export const PAGEFLOW_PREVIEW_PARAM = '__unplugin-pageflow_preview'

export function isPageFlowPreview(location: Location = window.location) {
  return new URLSearchParams(location.search).has(PAGEFLOW_PREVIEW_PARAM)
}

export { definePageFlowState, startPageFlowDomStatePersistence } from './state'
export type { PageFlowStateAdapter } from './state'
