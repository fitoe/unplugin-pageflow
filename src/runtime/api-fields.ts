import type { PageFlowApiField } from '../shared/types.ts'

interface ApiFieldOptions {
  maximumFields?: number
  maximumArrayItems?: number
  yieldEvery?: number
  yieldToHost?: () => Promise<void>
}

export async function collectApiFields(value: unknown, pageValues: string, options: ApiFieldOptions = {}) {
  const maximumFields = options.maximumFields ?? 1_000
  const maximumArrayItems = options.maximumArrayItems ?? 100
  const yieldEvery = options.yieldEvery ?? 200
  const fields: PageFlowApiField[] = []
  const pending: Array<{ path: string, value: unknown }> = [{ path: '', value }]
  let visited = 0

  while (pending.length && fields.length < maximumFields) {
    const item = pending.pop()!
    if (Array.isArray(item.value)) {
      const values = item.value.slice(0, maximumArrayItems)
      for (let index = values.length - 1; index >= 0; index--)
        pending.push({ path: `${item.path}[${index}]`, value: values[index] })
    } else if (item.value && typeof item.value === 'object') {
      Object.entries(item.value).reverse().forEach(([key, child]) =>
        pending.push({ path: item.path ? `${item.path}.${key}` : key, value: child }))
    } else if (item.path) {
      const rendered = item.value == null ? String(item.value) : String(item.value)
      const fieldValue = typeof item.value === 'string' && item.value.length > 160
        ? `${item.value.slice(0, 157)}…`
        : typeof item.value === 'string' || typeof item.value === 'number' || typeof item.value === 'boolean'
          ? item.value
          : item.value == null ? null : rendered
      fields.push({ path: item.path, value: fieldValue, used: rendered !== '' && pageValues.includes(rendered) })
    }
    visited++
    if (pending.length && visited % yieldEvery === 0) await options.yieldToHost?.()
  }
  return fields
}
