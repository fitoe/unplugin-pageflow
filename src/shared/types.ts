export interface PageFlowOptions {
  enabled?: boolean
  previewPath?: string
  appUrl?: string
  dynamicParams?: Record<string, Record<string, string | number>>
  previewRoles?: Array<{ match: string; role: string }>
}

export interface ResolvedPageFlowOptions {
  enabled: boolean
  previewPath: string
  appUrl: string
  dynamicParams: Record<string, Record<string, string | number>>
  previewRoles: Array<{ match: string; role: string }>
}

export interface PageFlowRuntimeRoute {
  id: string
  name?: string
  path: string
  title: string
  componentFile?: string
}

export type PageFlowRouteMode = 'history' | 'hash'

export interface PageFlowRuntimeLink {
  label: string
  to: string
  hotspot?: { centerX: number; centerY: number }
}

export interface PageFlowRuntimePage {
  path: string
  title?: string
  links?: PageFlowRuntimeLink[]
}

export interface PageFlowLink {
  label: string
  to: string
  hotspot?: { centerX: number; centerY: number }
}

export interface PageFlowPage {
  id: string
  title: string
  path: string
  revision?: string
  accent: string
  links: PageFlowLink[]
}

export interface PageFlowThumbnailRecord {
  slot: string
  revision: string
  width: number
  height: number
  mimeType: string
  file: string
  updatedAt: number
  pageHeight?: number
  tileCount?: number
  tileIndex?: number
  tileTop?: number
  bytes?: number
}

export type PageFlowThumbnailManifest = Record<string, PageFlowThumbnailRecord>

export interface PageFlowGraph {
  pages: PageFlowPage[]
  routeMode: PageFlowRouteMode
  version: number
}
