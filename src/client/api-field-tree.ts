import type { PageFlowApiField } from '../shared/types'

export interface ApiFieldTreeNode {
  key: string
  label: string
  path: string
  value?: string
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
