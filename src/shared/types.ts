export interface PageFlowOptions {
  enabled?: boolean
  framework?: PageFlowFramework
  /** Framework integrations use this when their Vite root differs from the project root. */
  projectRoot?: string
  /** Routes for plain Vite apps or router integrations without runtime route discovery. */
  routes?: PageFlowRuntimeRoute[]
  previewPath?: string
  appUrl?: string
  dynamicParams?: Record<string, Record<string, string | number>>
  previewRoles?: Array<{ match: string; role: string }>
  groupNames?: Record<string, string>
  /** Explicit route or route-glob to test file/glob mappings. */
  pageTests?: Record<string, string[]>
  /** Explicit test commands. Placeholders: {file}, {name}. Commands run without a shell. */
  testCommands?: Partial<Record<PageFlowTestKind, PageFlowTestCommand>>
}

export type PageFlowFramework = 'auto' | 'uni-app' | 'vue' | 'nuxt' | 'astro' | 'react-router' | 'sveltekit' | 'solid-start' | 'next' | 'qwik-city' | 'vite'

export interface ResolvedPageFlowOptions {
  enabled: boolean
  framework: PageFlowFramework
  routes: PageFlowRuntimeRoute[]
  previewPath: string
  appUrl: string
  dynamicParams: Record<string, Record<string, string | number>>
  previewRoles: Array<{ match: string; role: string }>
  groupNames: Record<string, string>
  pageTests: Record<string, string[]>
  testCommands: Partial<Record<PageFlowTestKind, PageFlowTestCommand>>
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

export type PageFlowTestSource = 'config' | 'import' | 'route' | 'convention'
export type PageFlowTestKind = 'e2e' | 'component' | 'unit'

export interface PageFlowTestCommand {
  command: string
  args?: string[]
  timeoutMs?: number
}

export interface PageFlowPageTest {
  id: string
  name: string
  file: string
  line?: number
  kind: PageFlowTestKind
  source: PageFlowTestSource
  status: 'unknown' | 'passed' | 'failed' | 'skipped'
  duration?: number
  output?: string
  runnable?: boolean
  revision?: string
}
