import type { PageFlowDiagnostic, PageFlowPageTest } from '../shared/types'
import type { PageFlowPageCheck } from './page-checks'

export type PageFlowHealthSeverity = 'healthy' | 'suggestion' | 'warning' | 'error'
export type PageFlowPreviewStatus = 'live' | 'cached' | 'capturing' | 'missing' | 'failed' | 'virtual' | 'stale'

export interface PageFlowHealthInput {
  apiTotal: number
  apiIssues: number
  checks: PageFlowPageCheck[]
  tests: PageFlowPageTest[]
  diagnostics: PageFlowDiagnostic[]
  todos: Array<{ done: boolean }>
  preview: PageFlowPreviewStatus
}

export interface PageFlowHealthSummary {
  severity: PageFlowHealthSeverity
  api: { total: number, issues: number, badge: string }
  structure: { total: number, issues: number, passed: number }
  tests: { total: number, failed: number, unknown: number, badge: string }
  diagnostics: { total: number, error: number, warning: number, suggestion: number, badge: string }
  todos: { total: number, open: number, badge: string }
  preview: PageFlowPreviewStatus
}

function totalBadge(total: number, issueCount: number, issueLabel: string) {
  return issueCount ? `${total} · ${issueCount}${issueLabel}` : String(total)
}

export function createPageHealth(input: PageFlowHealthInput): PageFlowHealthSummary {
  const structureIssues = input.checks.filter(check => check.status !== 'passed').length
  const failedTests = input.tests.filter(test => test.status === 'failed').length
  const unknownTests = input.tests.filter(test => test.status === 'unknown' || test.status === 'skipped').length
  const diagnosticCounts = input.diagnostics.reduce((counts, item) => {
    counts[item.severity]++
    return counts
  }, { error: 0, warning: 0, suggestion: 0 })
  const openTodos = input.todos.filter(todo => !todo.done).length
  const error = input.preview === 'failed' || input.apiIssues > 0 || failedTests > 0 || diagnosticCounts.error > 0
  const warning = structureIssues > 0 || diagnosticCounts.warning > 0 || input.preview === 'missing' || input.preview === 'stale'
  const suggestion = diagnosticCounts.suggestion > 0 || unknownTests > 0 || openTodos > 0
  const diagnosticRisk = diagnosticCounts.error || diagnosticCounts.warning

  return {
    severity: error ? 'error' : warning ? 'warning' : suggestion ? 'suggestion' : 'healthy',
    api: {
      total: input.apiTotal,
      issues: input.apiIssues,
      badge: totalBadge(input.apiTotal, input.apiIssues, '异常'),
    },
    structure: {
      total: input.checks.length,
      issues: structureIssues,
      passed: input.checks.length - structureIssues,
    },
    tests: {
      total: input.tests.length,
      failed: failedTests,
      unknown: unknownTests,
      badge: totalBadge(input.tests.length, structureIssues + failedTests, '风险'),
    },
    diagnostics: {
      total: input.diagnostics.length,
      ...diagnosticCounts,
      badge: totalBadge(input.diagnostics.length, diagnosticRisk, diagnosticCounts.error ? '错误' : '警告'),
    },
    todos: {
      total: input.todos.length,
      open: openTodos,
      badge: totalBadge(input.todos.length, openTodos, '未完成'),
    },
    preview: input.preview,
  }
}

export const previewStatusLabels: Record<PageFlowPreviewStatus, string> = {
  live: '实时预览',
  cached: '缓存快照',
  capturing: '正在捕获快照',
  missing: '尚未捕获当前视口',
  failed: '预览失败',
  virtual: '虚拟页面',
  stale: '快照已过期',
}
