import type { PageFlowDiagnostic } from '@pageflow/core/types'

export type { PageFlowApiField, PageFlowApiResult, PageFlowDiagnostic, PageFlowDiagnosticCategory, PageFlowDiagnosticSeverity } from '@pageflow/core/types'

export type PageFlowDynamicParamValues = Record<string, string | number>

export interface PageFlowFigmaLink {
  url: string
  ref: string
  label?: string
  /** Figma file version last acknowledged by the user. */
  version?: string
}

export interface PageFlowPageConfig {
  name?: string
  figma?: string
  /** Figma file version last acknowledged by the user. */
  figmaVersion?: string
  /** Last parameterized location used to open this page. */
  location?: string
}

export interface PageFlowOptions {
  enabled?: boolean
  /** Show the development launcher on host pages. */
  launcher?: boolean
  /** Load the PageFlow UI source through Vite for hot updates during local development. */
  clientMode?: 'built' | 'source'
  framework?: PageFlowFramework
  /** Framework integrations use this when their Vite root differs from the project root. */
  projectRoot?: string
  /** Routes for plain Vite apps or router integrations without runtime route discovery. */
  routes?: PageFlowRuntimeRoute[]
  previewPath?: string
  appUrl?: string
  dynamicParams?: Record<string, PageFlowDynamicParamValues | PageFlowDynamicParamValues[]>
  previewRoles?: Array<{ match: string; role: string }>
  groupNames?: Record<string, string>
  pageNames?: Record<string, string>
  /** Page-owned metadata. */
  pages?: Record<string, PageFlowPageConfig>
  canvasLayouts?: Record<string, Record<string, [number, number]>>
  /** Page-tree placement overrides. These do not move or rename source files. */
  pageTree?: { placements?: Record<string, { group?: string, order?: number }> }
  /** Explicit route or route-glob to test file/glob mappings. */
  pageTests?: Record<string, string[]>
  /** Explicit test commands. Placeholders: {file}, {name}. Commands run without a shell. */
  testCommands?: Partial<Record<PageFlowTestKind, PageFlowTestCommand>>
  diagnostics?: PageFlowDiagnosticOptions
  apiDiagnostics?: PageFlowApiDiagnosticOptions
}

export interface PageFlowApiDiagnosticOptions {
  slowRequestMs?: number
  largeResponseBytes?: number
  duplicateWindowMs?: number
}

export interface ResolvedPageFlowApiDiagnosticOptions {
  slowRequestMs: number
  largeResponseBytes: number
  duplicateWindowMs: number
}

export interface PageFlowDiagnosticOptions {
  minimumFontSize?: number
  minimumTapSize?: number
  ignoreSelectors?: string[]
  rules?: Record<string, boolean>
}

export interface ResolvedPageFlowDiagnosticOptions {
  minimumFontSize: number
  minimumTapSize: number
  ignoreSelectors: string[]
  rules: Record<string, boolean>
}

export type PageFlowFramework = 'auto' | 'uni-app' | 'vue' | 'nuxt' | 'astro' | 'react-router' | 'sveltekit' | 'solid-start' | 'next' | 'qwik-city' | 'vite'

export interface ResolvedPageFlowOptions {
  enabled: boolean
  launcher: boolean
  framework: PageFlowFramework
  routes: PageFlowRuntimeRoute[]
  previewPath: string
  appUrl: string
  dynamicParams: Record<string, PageFlowDynamicParamValues | PageFlowDynamicParamValues[]>
  previewRoles: Array<{ match: string; role: string }>
  groupNames: Record<string, string>
  pageNames: Record<string, string>
  figmaPages: Record<string, PageFlowFigmaLink>
  pageLocations: Record<string, string>
  pageTreePlacements: Record<string, { group?: string, order?: number }>
  canvasLayouts: Record<string, Record<string, [number, number]>>
  pageTests: Record<string, string[]>
  testCommands: Partial<Record<PageFlowTestKind, PageFlowTestCommand>>
  diagnostics: ResolvedPageFlowDiagnosticOptions
  apiDiagnostics: ResolvedPageFlowApiDiagnosticOptions
  configFile?: PageFlowConfigFileStatus
}

export interface PageFlowConfigFileStatus {
  loaded: boolean
  source?: string
  error?: string
}

export interface PageFlowProjectConfig extends PageFlowConfigFileStatus {
  groupNames: Record<string, string>
  pageNames: Record<string, string>
  figmaPages: Record<string, PageFlowFigmaLink>
  pageLocations: Record<string, string>
  pageTreePlacements: Record<string, { group?: string, order?: number }>
  canvasLayouts: Record<string, Record<string, [number, number]>>
}

export interface PageFlowRuntimeRoute {
  id: string
  name?: string
  path: string
  title: string
  componentFile?: string
  /** Static redirect target reported by the router. Redirect-only routes are not canvas pages. */
  redirect?: string
  /** Original path for a router alias. Aliases are not separate canvas pages. */
  aliasOf?: string
  /** Framework-reported fallback route. */
  catchAll?: boolean
}

export type PageFlowRouteMode = 'history' | 'hash'

export interface PageFlowRuntimeLink {
  label: string
  to: string
  location?: string
  kind?: 'link' | 'event'
  hotspot?: { centerX: number; centerY: number; width?: number; height?: number }
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
  kind?: 'link' | 'event'
  hotspot?: { centerX: number; centerY: number; width?: number; height?: number }
}

export interface PageFlowPage {
  id: string
  title: string
  path: string
  virtual?: boolean
  sourceFile?: string
  routeOrder?: number
  revision?: string
  accent: string
  links: PageFlowLink[]
  diagnostics?: PageFlowDiagnostic[]
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

export interface PageFlowLighthouseIssue {
  id: string
  title: string
  description: string
  score: number | null
  displayValue?: string
  helpUrl?: string
}

export interface PageFlowLighthouseReport {
  url: string
  fetchedAt: string
  scores: Record<'performance' | 'accessibility' | 'best-practices' | 'seo', number | null>
  issues: PageFlowLighthouseIssue[]
}

export interface PageFlowLighthouseSession {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
}
