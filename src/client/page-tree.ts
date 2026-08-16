import type { PageFlowPage } from '../shared/types'

export interface PageTreePageNode {
  kind: 'page'
  key: string
  label: string
  pageId: string
  path: string
  virtual: boolean
  order: number
}

export interface PageTreeGroupNode {
  kind: 'group'
  key: string
  label: string
  path: string[]
  children: PageTreeNode[]
  pageCount: number
  order: number
}

export type PageTreeNode = PageTreeGroupNode | PageTreePageNode

export interface PageTreeRow {
  node: PageTreeNode
  depth: number
}

interface PageTreeOptions {
  groupNames?: Record<string, string>
  pageNames?: Record<string, string>
  groupPath: (page: PageFlowPage) => string[]
}

export function createPageTree(pages: PageFlowPage[], options: PageTreeOptions): PageTreeNode[] {
  const roots: PageTreeNode[] = []
  const groups = new Map<string, PageTreeGroupNode>()

  pages.forEach((page, order) => {
    const path = options.groupPath(page)
    let children = roots
    path.forEach((segment, index) => {
      const groupPath = path.slice(0, index + 1)
      const pathKey = groupPath.join('/')
      const key = `group:${pathKey}`
      let group = groups.get(key)
      if (!group) {
        group = {
          kind: 'group',
          key,
          label: options.groupNames?.[pathKey] ?? segment,
          path: groupPath,
          children: [],
          pageCount: 0,
          order,
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
      label: options.pageNames?.[page.path] ?? page.title,
      pageId: page.id,
      path: page.path,
      virtual: Boolean(page.virtual),
      order,
    })
  })

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
