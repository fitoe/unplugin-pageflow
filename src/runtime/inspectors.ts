import type { PageFlowDiagnostic } from '../shared/types.ts'

export interface PageFlowInspectorContext {
  document: Document
  location: Location
}

export type PageFlowInspectorDiagnostic = Omit<PageFlowDiagnostic, 'id' | 'source'> & { id?: string }

export interface PageFlowInspector {
  id: string
  inspect(context: PageFlowInspectorContext): PageFlowInspectorDiagnostic[] | Promise<PageFlowInspectorDiagnostic[]>
}

const registryKey = Symbol.for('unplugin-pageflow.inspectors')

interface InspectorRegistry {
  inspectors: Map<string, PageFlowInspector>
  revision: number
}

function registry() {
  const root = globalThis as typeof globalThis & { [registryKey]?: InspectorRegistry }
  return root[registryKey] ??= { inspectors: new Map(), revision: 0 }
}

export function registerPageFlowInspector(inspector: PageFlowInspector) {
  if (!inspector.id.trim()) throw new Error('PageFlow inspector id is required')
  const state = registry()
  state.inspectors.set(inspector.id, inspector)
  state.revision++
  return () => {
    if (state.inspectors.get(inspector.id) !== inspector) return false
    const deleted = state.inspectors.delete(inspector.id)
    if (deleted) state.revision++
    return deleted
  }
}

export function pageFlowInspectorRevision() {
  return registry().revision
}

export async function runPageFlowInspectors(context: PageFlowInspectorContext): Promise<PageFlowDiagnostic[]> {
  const results = await Promise.all([...registry().inspectors.values()].map(async (inspector) => {
    try {
      const diagnostics: PageFlowInspectorDiagnostic[] = await inspector.inspect(context)
      return diagnostics.map((item, index): PageFlowDiagnostic => ({
        ...item,
        id: `inspector:${inspector.id}:${item.id ?? `${item.ruleId}:${index}`}`,
        source: inspector.id,
      }))
    } catch (error) {
      return [{
        id: `inspector:${inspector.id}:error`,
        ruleId: 'inspector-error',
        severity: 'warning' as const,
        category: 'interaction' as const,
        title: `Inspector “${inspector.id}” 执行失败`,
        description: error instanceof Error ? error.message : 'Unknown inspector error',
        source: inspector.id,
      }]
    }
  }))
  return results.flat()
}
