import type { PageFlowDiagnostic, PageFlowLighthouseReport, PageFlowPage } from '../shared/types'

export function createDiagnosticReport(page: Pick<PageFlowPage, 'title' | 'path'>, diagnostics: PageFlowDiagnostic[], lighthouse?: PageFlowLighthouseReport, generatedAt = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    generatedAt,
    page: { title: page.title, path: page.path },
    summary: diagnostics.reduce((summary, item) => {
      summary[item.severity]++
      return summary
    }, { error: 0, warning: 0, suggestion: 0 }),
    diagnostics,
    lighthouse: lighthouse ?? null,
  }
}

export function diagnosticReportFilename(path: string) {
  const name = path.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-') || 'home'
  return `pageflow-diagnostics-${name}.json`
}
