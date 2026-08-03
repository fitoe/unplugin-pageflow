import type { PageFlowHost } from './host'
import { parsePageFlowTodos, type PageFlowTodos } from './todos'
import { legacyChromeCanvasStorageKey, LEGACY_UNPLUGIN_TODOS_STORAGE_KEY, PAGEFLOW_TODOS_STORAGE_KEY, pageFlowCanvasStorageKey } from './storage'

export async function loadPageFlowTodos(host: PageFlowHost): Promise<PageFlowTodos> {
  const current = await host.loadStorage(PAGEFLOW_TODOS_STORAGE_KEY)
  if (current !== undefined) return parsePageFlowTodos(current)
  const legacy = await host.loadStorage(LEGACY_UNPLUGIN_TODOS_STORAGE_KEY)
  const todos = parsePageFlowTodos(legacy)
  if (legacy !== undefined) {
    await host.saveStorage(PAGEFLOW_TODOS_STORAGE_KEY, todos)
    await host.removeStorage(LEGACY_UNPLUGIN_TODOS_STORAGE_KEY)
  }
  return todos
}

export function savePageFlowTodos(host: PageFlowHost, todos: PageFlowTodos) {
  return host.saveStorage(PAGEFLOW_TODOS_STORAGE_KEY, todos)
}

export async function loadPageFlowCanvas<T>(host: PageFlowHost, origin: string): Promise<T | undefined> {
  const currentKey = pageFlowCanvasStorageKey(origin)
  const current = await host.loadStorage<T>(currentKey)
  if (current !== undefined) return current
  const legacyKey = legacyChromeCanvasStorageKey(origin)
  const legacy = await host.loadStorage<T>(legacyKey)
  if (legacy !== undefined) {
    await host.saveStorage(currentKey, legacy)
    await host.removeStorage(legacyKey)
  }
  return legacy
}

export function savePageFlowCanvas(host: PageFlowHost, origin: string, value: unknown) {
  return host.saveStorage(pageFlowCanvasStorageKey(origin), value)
}

export async function clearPageFlowCanvas(host: PageFlowHost, origin: string) {
  await host.removeStorage(pageFlowCanvasStorageKey(origin))
  await host.removeStorage(legacyChromeCanvasStorageKey(origin))
}
