import type { PageFlowApiField } from '../shared/types'

export interface ApiFieldTreeNode {
  key: string
  label: string
  path: string
  value?: string | number | boolean | null
  used: boolean
  children: ApiFieldTreeNode[]
}

function pathSegments(path: string) {
  return [...path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)]
    .map(match => match[2] == null ? match[1] : `[${match[2]}]`)
}

export function buildApiFieldTree(fields: PageFlowApiField[]) {
  const roots: ApiFieldTreeNode[] = []

  for (const field of fields) {
    let siblings = roots
    let currentPath = ''
    const segments = pathSegments(field.path)

    segments.forEach((label, index) => {
      currentPath = label.startsWith('[') ? `${currentPath}${label}` : currentPath ? `${currentPath}.${label}` : label
      let node = siblings.find(item => item.label === label)
      if (!node) {
        node = { key: currentPath, label, path: currentPath, used: false, children: [] }
        siblings.push(node)
      }
      node.used ||= field.used
      if (index === segments.length - 1) node.value = field.value
      siblings = node.children
    })
  }

  return roots
}

export function apiFieldTreeData(nodes: ApiFieldTreeNode[]): unknown {
  const array = nodes.length > 0 && nodes.every(node => /^\[\d+\]$/.test(node.label))
  if (array) {
    const result: unknown[] = []
    nodes.forEach((node) => {
      const index = Number(node.label.slice(1, -1))
      result[index] = node.children.length ? apiFieldTreeData(node.children) : node.value
    })
    return result
  }
  return Object.fromEntries(nodes.map(node => [
    node.label,
    node.children.length ? apiFieldTreeData(node.children) : node.value,
  ]))
}
