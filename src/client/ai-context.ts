import type {
  PageFlowApiResult,
  PageFlowDiagnostic,
  PageFlowLighthouseReport,
  PageFlowLink,
  PageFlowPage,
  PageFlowPageTest,
} from '../shared/types'

export interface PageFlowAIContext {
  schemaVersion: 1
  generatedAt: string
  page: Pick<PageFlowPage, 'title' | 'path' | 'sourceFile'>
  diagnostics: PageFlowDiagnostic[]
  requests: PageFlowApiResult[]
  tests: PageFlowPageTest[]
  links: PageFlowLink[]
  lighthouse: PageFlowLighthouseReport | null
}

export function createPageFlowAIContext(
  page: Pick<PageFlowPage, 'title' | 'path' | 'sourceFile'>,
  input: {
    diagnostics: PageFlowDiagnostic[]
    requests: PageFlowApiResult[]
    tests: PageFlowPageTest[]
    links: PageFlowLink[]
    lighthouse?: PageFlowLighthouseReport
  },
  generatedAt = new Date().toISOString(),
): PageFlowAIContext {
  return {
    schemaVersion: 1,
    generatedAt,
    page: { title: page.title, path: page.path, sourceFile: page.sourceFile },
    diagnostics: input.diagnostics,
    requests: input.requests,
    tests: input.tests,
    links: input.links,
    lighthouse: input.lighthouse ?? null,
  }
}

export function createPageFlowAIPrompt(context: PageFlowAIContext) {
  return [
    '请分析下面的 PageFlow 页面上下文，并给出可执行的修改建议。',
    '优先处理影响正常使用的问题；避免无关重构。若信息足够，请指出需要修改的文件或代码位置，并给出最小代码 diff 和验证方式。',
    '',
    '```json',
    JSON.stringify(context, null, 2),
    '```',
  ].join('\n')
}
