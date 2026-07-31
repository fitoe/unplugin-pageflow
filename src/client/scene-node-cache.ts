import { Group, UI } from 'leafer-ui'

interface SceneNodeEntry<T extends UI> {
  node: T
  signature: string
}

export class SceneNodeCache<T extends UI> {
  private readonly entries = new Map<string, SceneNodeEntry<T>>()

  constructor(private readonly parent: Group) {}

  get size() {
    return this.entries.size
  }

  upsert(id: string, signature: string, create: () => T, update: (node: T) => void) {
    const existing = this.entries.get(id)
    if (existing?.signature === signature) {
      update(existing.node)
      return existing.node
    }
    if (existing) this.parent.remove(existing.node, true)
    const node = create()
    this.parent.add(node)
    this.entries.set(id, { node, signature })
    return node
  }

  retain(ids: Set<string>) {
    this.entries.forEach((entry, id) => {
      if (ids.has(id)) return
      this.parent.remove(entry.node, true)
      this.entries.delete(id)
    })
  }

  clear() {
    this.parent.removeAll(true)
    this.entries.clear()
  }
}
