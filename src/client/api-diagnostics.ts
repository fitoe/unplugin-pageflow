import type { PageFlowApiResult, ResolvedPageFlowApiDiagnosticOptions } from '../shared/types'

export interface PageFlowApiIssue {
  resultId: string
  status: 'failed' | 'warning'
  title: string
  descriptions: string[]
}

export function apiRequestKey(result: Pick<PageFlowApiResult, 'method' | 'url'>) {
  let path = result.url.split(/[?#]/, 1)[0]
  try {
    path = new URL(result.url, 'http://pageflow.local').pathname
  } catch {}
  return `${result.method.toUpperCase()}:${path}`
}

export function mergeApiResult(results: PageFlowApiResult[], incoming: PageFlowApiResult) {
  const key = apiRequestKey(incoming)
  const previous = results.find(result => apiRequestKey(result) === key)
  const merged: PageFlowApiResult = previous ? {
    ...incoming,
    id: key,
    occurrences: (previous.occurrences ?? 1) + 1,
    lastIntervalMs: previous.occurredAt != null && incoming.occurredAt != null
      ? Math.max(0, incoming.occurredAt - previous.occurredAt)
      : undefined,
  } : { ...incoming, id: key, occurrences: 1 }
  return [...results.filter(result => apiRequestKey(result) !== key), merged].slice(-30)
}

export function createApiIssues(results: PageFlowApiResult[], options: ResolvedPageFlowApiDiagnosticOptions): PageFlowApiIssue[] {
  return results.flatMap((result) => {
    const descriptions: string[] = []
    const failed = result.status === 0 || result.status >= 400
    if (result.status === 0) descriptions.push('网络请求失败')
    else if (failed) descriptions.push(`HTTP ${result.status}`)
    if (result.duration > options.slowRequestMs) descriptions.push(`耗时 ${result.duration}ms，超过 ${options.slowRequestMs}ms`)
    if ((result.responseSize ?? 0) > options.largeResponseBytes)
      descriptions.push(`响应 ${result.responseSize} bytes，超过 ${options.largeResponseBytes} bytes`)
    if ((result.occurrences ?? 1) > 1 && (result.lastIntervalMs ?? Number.POSITIVE_INFINITY) <= options.duplicateWindowMs)
      descriptions.push(`${result.lastIntervalMs}ms 内重复请求，累计 ${result.occurrences} 次`)
    if (!descriptions.length) return []
    return [{
      resultId: result.id,
      status: failed ? 'failed' : 'warning',
      title: `${result.method.toUpperCase()} ${result.url}`,
      descriptions,
    }]
  })
}
