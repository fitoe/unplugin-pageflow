import { readPageFlowConfigWithBackup, ensurePageFlowConfig } from './config-store.ts'
export { stripJsonComments } from './config-json.ts'
import { resolve } from 'node:path'
import type { PageFlowOptions, ResolvedPageFlowOptions } from '../shared/types.ts'
import { resolvePageFlowApiDiagnosticOptions, resolvePageFlowDiagnosticOptions } from '../shared/options.ts'
import { normalizeFigmaPages } from '../client/figma.ts'

function normalizePreviewPath(path: string) {
  return `/${path.replace(/^\/+|\/+$/g, '')}/`
}

export function resolveOptions(options: PageFlowOptions = {}): ResolvedPageFlowOptions {
  const pageNames = Object.fromEntries(Object.entries(options.pages ?? {}).flatMap(([path, page]) => page.name?.trim() ? [[path, page.name.trim()]] : []))
  const pageFigma = Object.fromEntries(Object.entries(options.pages ?? {}).flatMap(([path, page]) => page.figma ? [[path, page.figma]] : []))
  const pageFigmaVersions = Object.fromEntries(Object.entries(options.pages ?? {}).flatMap(([path, page]) => page.figmaVersion?.trim() ? [[path, page.figmaVersion.trim()]] : []))
  const pageLocations = Object.fromEntries(Object.entries(options.pages ?? {}).flatMap(([path, page]) => page.location?.trim() ? [[path, page.location.trim()]] : []))
  const resolvedPageNames = { ...(options.pageNames ?? {}), ...pageNames }
  return {
    enabled: options.enabled ?? true,
    launcher: options.launcher ?? true,
    framework: options.framework ?? 'auto',
    routes: options.routes ?? [],
    previewPath: normalizePreviewPath(options.previewPath ?? '/__unplugin-pageflow/'),
    appUrl: options.appUrl ?? '/',
    dynamicParams: options.dynamicParams ?? {},
    previewRoles: options.previewRoles ?? [],
    groupNames: options.groupNames ?? {},
    pageNames: resolvedPageNames,
    figmaPages: normalizeFigmaPages(pageFigma, resolvedPageNames, pageFigmaVersions),
    pageLocations,
    pageTreePlacements: options.pageTree?.placements ?? {},
    canvasLayouts: options.canvasLayouts ?? {},
    pageTests: options.pageTests ?? {},
    testCommands: options.testCommands ?? {},
    diagnostics: resolvePageFlowDiagnosticOptions(options.diagnostics),
    apiDiagnostics: resolvePageFlowApiDiagnosticOptions(options.apiDiagnostics),
  }
}

export async function loadProjectOptions(root: string, options: PageFlowOptions = {}) {
  const file = resolve(root, '.pageflow')
  let stored: PageFlowOptions = {}
  try {
    stored = await readPageFlowConfigWithBackup(file)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw error
    await ensurePageFlowConfig(file, options)
    stored = await readPageFlowConfigWithBackup(file)
  }
  return {
    ...resolveOptions({
      ...stored,
      ...options,
      dynamicParams: options.dynamicParams ?? stored.dynamicParams,
      routes: options.routes ?? stored.routes,
      previewRoles: options.previewRoles ?? stored.previewRoles,
      groupNames: { ...(options.groupNames ?? {}), ...(stored.groupNames ?? {}) },
      pageNames: { ...(options.pageNames ?? {}), ...(stored.pageNames ?? {}) },
      pages: { ...(options.pages ?? {}), ...(stored.pages ?? {}) },
      canvasLayouts: { ...(options.canvasLayouts ?? {}), ...(stored.canvasLayouts ?? {}) },
      pageTree: {
        placements: { ...(options.pageTree?.placements ?? {}), ...(stored.pageTree?.placements ?? {}) },
      },
      pageTests: options.pageTests ?? stored.pageTests,
      testCommands: options.testCommands ?? stored.testCommands,
      diagnostics: {
        ...stored.diagnostics,
        ...options.diagnostics,
        rules: { ...stored.diagnostics?.rules, ...options.diagnostics?.rules },
      },
      apiDiagnostics: { ...stored.apiDiagnostics, ...options.apiDiagnostics },
    }),
    configFile: { loaded: true, source: file },
  }
}
