import type { PageFlowPage } from '../shared/types'

export interface PageTreePageNode {
  kind: 'page'
  key: string
  label: string
  pageId: string
  path: string
  virtual: boolean
  order: number
  parentKey: string
}

export interface PageTreeGroupNode {
  kind: 'group'
  key: string
  label: string
  path: string[]
  children: PageTreeNode[]
  pageCount: number
  order: number
  navigable?: boolean
  parentKey: string
}

export type PageTreeNode = PageTreeGroupNode | PageTreePageNode

export interface PageTreeRow {
  node: PageTreeNode
  depth: number
}

interface PageTreeOptions {
  groupNames?: Record<string, string>
  pageNames?: Record<string, string>
  orphanPageIds?: ReadonlySet<string>
  groupPath: (page: PageFlowPage) => string[]
  placements?: Record<string, { group?: string, order?: number }>
}

function effectiveGroupPath(path: string[], placements: PageTreeOptions['placements']) {
  let result = [...path]
  const visited = new Set<string>()
  for (let attempt = 0; attempt < 20; attempt++) {
    let changed = false
    for (let length = result.length; length > 0; length--) {
      const key = `group:${result.slice(0, length).join('/')}`
      const parent = placements?.[key]?.group
      if (parent === undefined || visited.has(key)) continue
      visited.add(key)
      result = [...parent.split('/').filter(Boolean), result[length - 1]!, ...result.slice(length)]
      changed = true
      break
    }
    if (!changed) break
  }
  return result
}

export function placePageTreePath(paths: string[], path: string, relatedPath?: string, insertAfter = false) {
  const next = paths.filter(item => item !== path)
  const relatedIndex = relatedPath ? next.indexOf(relatedPath) : -1
  next.splice(relatedIndex < 0 ? 0 : relatedIndex + (insertAfter ? 1 : 0), 0, path)
  return next
}

function placementKey(node: PageTreeNode) {
  return node.kind === 'page' ? node.path : node.key
}

function applyPageOrder(children: PageTreeNode[], placements: PageTreeOptions['placements']) {
  const placed = children.filter(node => placements?.[placementKey(node)]?.order !== undefined)
    .sort((left, right) => placements![placementKey(left)]!.order! - placements![placementKey(right)]!.order! || left.order - right.order)
  if (placed.length) {
    const placedKeys = new Set(placed.map(page => page.key))
    const ordered = children.filter(node => !placedKeys.has(node.key))
    placed.forEach(node => ordered.splice(Math.max(0, Math.min(placements![placementKey(node)]!.order!, ordered.length)), 0, node))
    children.splice(0, children.length, ...ordered)
  }
  for (const node of children) {
    if (node.kind === 'group') applyPageOrder(node.children, placements)
  }
}

export function pageTreePageLabel(page: Pick<PageFlowPage, 'path' | 'title'>, pageNames?: Record<string, string>) {
  const configured = pageNames?.[page.path]?.trim()
  if (configured) return configured
  const title = page.title.trim()
  if (title) return title
  const segments = page.path.split('/').filter(Boolean)
  const segment = segments.at(-1)?.toLowerCase() === 'index' ? segments.at(-2) : segments.at(-1)
  if (!segment) return page.path || '未命名页面'
  if (segment.toLowerCase() === 'ai') return 'AI'
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/^\p{Ll}/u, value => value.toUpperCase())
}

export function createPageTree(pages: PageFlowPage[], options: PageTreeOptions): PageTreeNode[] {
  const roots: PageTreeNode[] = []
  const groups = new Map<string, PageTreeGroupNode>()
  const groupIdentities = new Map<string, string>()

  pages.forEach((page) => {
    const originalPath = options.groupPath(page)
    originalPath.forEach((_, index) => {
      const sourcePath = originalPath.slice(0, index + 1)
      const effectivePath = effectiveGroupPath(sourcePath, options.placements).join('/')
      groupIdentities.set(effectivePath, `group:${sourcePath.join('/')}`)
    })
  })

  const orphanPages: Array<{ page: PageFlowPage, order: number }> = []
  pages.forEach((page, order) => {
    if (options.orphanPageIds?.has(page.id)) {
      orphanPages.push({ page, order })
      return
    }
    const configuredGroup = options.placements?.[page.path]?.group
    const basePath = configuredGroup === undefined ? options.groupPath(page) : configuredGroup.split('/').filter(Boolean)
    const path = effectiveGroupPath(basePath, options.placements)
    let children = roots
    path.forEach((segment, index) => {
      const groupPath = path.slice(0, index + 1)
      const pathKey = groupPath.join('/')
      const key = groupIdentities.get(pathKey) ?? `group:${pathKey}`
      let group = groups.get(key)
      if (!group) {
        group = {
          kind: 'group',
          key,
          label: options.groupNames?.[key.slice('group:'.length)] ?? options.groupNames?.[pathKey] ?? segment,
          path: groupPath,
          children: [],
          pageCount: 0,
          order,
          parentKey: path.slice(0, index).join('/'),
        }
        groups.set(key, group)
        children.push(group)
      }
      group.pageCount += 1
      children = group.children
    })
    children.push({
      kind: 'page',
      key: `page:${page.id}`,
      label: pageTreePageLabel(page, options.pageNames),
      pageId: page.id,
      path: page.path,
      virtual: Boolean(page.virtual),
      order,
      parentKey: path.join('/'),
    })
  })

  if (orphanPages.length) {
    roots.push({
      kind: 'group',
      key: 'group:__pageflow_orphans__',
      label: '孤岛页面',
      path: [],
      children: orphanPages.map(({ page, order }) => ({
        kind: 'page',
        key: `page:${page.id}`,
        label: pageTreePageLabel(page, options.pageNames),
        pageId: page.id,
        path: page.path,
        virtual: Boolean(page.virtual),
        order,
        parentKey: '__pageflow_orphans__',
      })),
      pageCount: orphanPages.length,
      order: pages.length,
      navigable: false,
      parentKey: '',
    })
  }

  applyPageOrder(roots, options.placements)

  return roots
}

export function flattenPageTree(nodes: PageTreeNode[], expandedKeys: ReadonlySet<string>, depth = 0): PageTreeRow[] {
  return nodes.flatMap((node) => {
    const row = { node, depth }
    if (node.kind === 'page' || !expandedKeys.has(node.key)) return [row]
    return [row, ...flattenPageTree(node.children, expandedKeys, depth + 1)]
  })
}

export function pageTreeAncestorKeys(nodes: PageTreeNode[], pageId: string): string[] {
  for (const node of nodes) {
    if (node.kind === 'page') {
      if (node.pageId === pageId) return []
      continue
    }
    const descendants = pageTreeAncestorKeys(node.children, pageId)
    if (descendants.length || node.children.some(child => child.kind === 'page' && child.pageId === pageId)) {
      return [node.key, ...descendants]
    }
  }
  return []
}

export function pageTreeGroupKeys(nodes: PageTreeNode[]): string[] {
  return nodes.flatMap(node => node.kind === 'group' ? [node.key, ...pageTreeGroupKeys(node.children)] : [])
}
