export interface PageFlowOptions {
  enabled?: boolean
  previewPath?: string
  appUrl?: string
  dynamicParams?: Record<string, Record<string, string | number>>
  previewRoles?: Array<{ match: string; role: string }>
  groupNames?: Record<string, string>
}

export interface ResolvedPageFlowOptions {
  enabled: boolean
  previewPath: string
  appUrl: string
  dynamicParams: Record<string, Record<string, string | number>>
  previewRoles: Array<{ match: string; role: string }>
  groupNames: Record<string, string>
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
  location?: string
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
  location?: string
  hotspot?: { centerX: number; centerY: number }
}

export interface PageFlowPage {
  id: string
  title: string
  path: string
  routeOrder?: number
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

export interface PageFlowApiField {
  path: string
  value: string
  used: boolean
}

export interface PageFlowApiResult {
  id: string
  method: string
  url: string
  status: number
  duration: number
  fields: PageFlowApiField[]
}
