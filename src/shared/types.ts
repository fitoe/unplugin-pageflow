export interface PageFlowOptions {
  enabled?: boolean
  previewPath?: string
  appUrl?: string
  dynamicParams?: Record<string, Record<string, string | number>>
}

export interface ResolvedPageFlowOptions {
  enabled: boolean
  previewPath: string
  appUrl: string
  dynamicParams: Record<string, Record<string, string | number>>
}

export interface PageFlowRuntimeRoute {
  id: string
  name?: string
  path: string
  title: string
  componentFile?: string
}

export interface PageFlowRuntimeLink {
  label: string
  to: string
}

export interface PageFlowRuntimePage {
  path: string
  links: PageFlowRuntimeLink[]
}

export interface PageFlowLink {
  label: string
  to: string
}

export interface PageFlowPage {
  id: string
  title: string
  path: string
  accent: string
  links: PageFlowLink[]
}

export interface PageFlowGraph {
  pages: PageFlowPage[]
  version: number
}
