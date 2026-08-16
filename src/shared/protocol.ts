export const PAGEFLOW_PREVIEW_PARAM = '__unplugin-pageflow_preview'
export const PAGEFLOW_ROLE_PARAM = '__unplugin-pageflow_role'
export const PAGEFLOW_INSPECT_PARAM = '__unplugin-pageflow_inspect'
export const PAGEFLOW_LEGACY_PREVIEW_PARAM = '__unplugin_pageflow_preview'
export const PAGEFLOW_LEGACY_ROLE_PARAM = '__unplugin_pageflow_role'
export const PAGEFLOW_LEGACY_INSPECT_PARAM = '__unplugin_pageflow_inspect'
export const PAGEFLOW_INTERNAL_PARAMS = [
  PAGEFLOW_PREVIEW_PARAM,
  PAGEFLOW_ROLE_PARAM,
  PAGEFLOW_INSPECT_PARAM,
  PAGEFLOW_LEGACY_PREVIEW_PARAM,
  PAGEFLOW_LEGACY_ROLE_PARAM,
  PAGEFLOW_LEGACY_INSPECT_PARAM,
] as const

export function hasPageFlowPreview(params: URLSearchParams) {
  return params.has(PAGEFLOW_PREVIEW_PARAM) || params.has(PAGEFLOW_LEGACY_PREVIEW_PARAM)
}

export function hasPageFlowInspection(params: URLSearchParams) {
  return params.has(PAGEFLOW_INSPECT_PARAM) || params.has(PAGEFLOW_LEGACY_INSPECT_PARAM)
}

export function pageFlowPreviewRole(params: URLSearchParams) {
  return params.get(PAGEFLOW_ROLE_PARAM) ?? params.get(PAGEFLOW_LEGACY_ROLE_PARAM) ?? ''
}

export function deletePageFlowInternalParams(params: URLSearchParams) {
  PAGEFLOW_INTERNAL_PARAMS.forEach(param => params.delete(param))
}

export const PAGEFLOW_GRAPH_EVENT = 'unplugin-pageflow:graph-update'
export const PAGEFLOW_PAGE_EVENT = 'unplugin-pageflow:page-update'
export const PAGEFLOW_PAGE_REPORTED_MESSAGE = 'unplugin-pageflow:page-reported'
export const PAGEFLOW_NAVIGATE_MESSAGE = 'unplugin-pageflow:navigate'
export const PAGEFLOW_SCAN_MESSAGE = 'unplugin-pageflow:scan-page'
export const PAGEFLOW_SCAN_RESULT_MESSAGE = 'unplugin-pageflow:scan-result'
export const PAGEFLOW_HOTSPOT_HOVER_MESSAGE = 'unplugin-pageflow:hotspot-hover'
export const PAGEFLOW_ESCAPE_MESSAGE = 'unplugin-pageflow:escape'
export const PAGEFLOW_READY_EVENT = 'unplugin-pageflow:ready'
export const PAGEFLOW_NETWORK_EVENT = 'unplugin-pageflow:network'
export const PAGEFLOW_API_RESULT_MESSAGE = 'unplugin-pageflow:api-result'
export const PAGEFLOW_WEBGL_CANVAS_ATTRIBUTE = 'data-unplugin-pageflow-webgl'
export const PAGEFLOW_TEST_EVENT = 'unplugin-pageflow:test-update'
export const PAGEFLOW_DIAGNOSTICS_SCAN_MESSAGE = 'unplugin-pageflow:diagnostics-scan'
export const PAGEFLOW_DIAGNOSTICS_RESULT_MESSAGE = 'unplugin-pageflow:diagnostics-result'
export const PAGEFLOW_DIAGNOSTIC_HIGHLIGHT_MESSAGE = 'unplugin-pageflow:diagnostic-highlight'
export const PAGEFLOW_FORM_COMMAND_MESSAGE = 'unplugin-pageflow:form-command'
export const PAGEFLOW_FORM_RESULT_MESSAGE = 'unplugin-pageflow:form-result'
