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
  navigable?: boolean
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

  const orphanPages: Array<{ page: PageFlowPage, order: number }> = []
  pages.forEach((page, order) => {
    if (options.orphanPageIds?.has(page.id)) {
      orphanPages.push({ page, order })
      return
    }
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
      label: pageTreePageLabel(page, options.pageNames),
      pageId: page.id,
      path: page.path,
      virtual: Boolean(page.virtual),
      order,
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
      })),
      pageCount: orphanPages.length,
      order: pages.length,
      navigable: false,
    })
  }

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
