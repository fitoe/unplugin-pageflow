export interface PageFlowTodo { id: string; text: string; done: boolean }
export type PageFlowTodos = Record<string, PageFlowTodo[]>

export function parsePageFlowTodos(value: unknown): PageFlowTodos {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).map(([pageId, items]) => [
    pageId,
    Array.isArray(items) ? items.filter((item): item is PageFlowTodo => Boolean(item)
      && typeof item === 'object'
      && typeof (item as PageFlowTodo).id === 'string'
      && typeof (item as PageFlowTodo).text === 'string'
      && typeof (item as PageFlowTodo).done === 'boolean') : [],
  ]))
}

export function addPageFlowTodo(todos: PageFlowTodos, pageId: string, text: string, id = crypto.randomUUID()): PageFlowTodos {
  const normalized = text.trim()
  if (!normalized) return todos
  return { ...todos, [pageId]: [...(todos[pageId] ?? []), { id, text: normalized, done: false }] }
}

export function togglePageFlowTodo(todos: PageFlowTodos, pageId: string, id: string): PageFlowTodos {
  return { ...todos, [pageId]: (todos[pageId] ?? []).map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo) }
}

export function removePageFlowTodo(todos: PageFlowTodos, pageId: string, id: string): PageFlowTodos {
  return { ...todos, [pageId]: (todos[pageId] ?? []).filter(todo => todo.id !== id) }
}
