import { createUnplugin } from 'unplugin'
import type { UnpluginFactory } from 'unplugin'
import { createHash } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import type {
  PageFlowGraph,
  PageFlowLighthouseSession,
  PageFlowOptions,
  PageFlowPage,
  PageFlowRuntimeLink,
  PageFlowRuntimePage,
  PageFlowRuntimeRoute,
  PageFlowRouteMode,
  ResolvedPageFlowOptions,
} from '../shared/types.ts'
import { PAGEFLOW_GRAPH_EVENT, PAGEFLOW_PAGE_EVENT } from '../shared/protocol.ts'
import {
  PAGEFLOW_CLIENT_ID,
  PAGEFLOW_CLIENT_RESOLVED_ID,
  PAGEFLOW_CONFIG_ID,
  PAGEFLOW_CONFIG_RESOLVED_ID,
  PAGEFLOW_RUNTIME_ID,
  PAGEFLOW_RUNTIME_RESOLVED_ID,
} from './constants.ts'
import { createThumbnailCache } from './thumbnail-cache.ts'
import { isPageFlowTestFile, PageTestIndex } from './page-tests.ts'
import { createPageTestResultCache } from './page-test-results.ts'
import { runPageFlowLighthouse } from './lighthouse.ts'
import { extractEventNavigationDiagnostics } from './source-diagnostics.ts'
import { PAGEFLOW_TEST_EVENT } from '../shared/protocol.ts'

const ACCENTS = ['#ff795d', '#7c6cff', '#26b99a', '#e7ad43', '#dd648e']

async function terminateProcessTree(child: ChildProcess) {
  if (!child.pid || child.exitCode != null) return
  if (process.platform === 'win32') {
    await new Promise<void>(resolveDone => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
      killer.once('error', () => {
        child.kill()
        resolveDone()
      })
      killer.once('close', () => resolveDone())
    })
    return
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
}

function normalizePreviewPath(path: string) {
  return `/${path.replace(/^\/+|\/+$/g, '')}/`
}

function resolveDiagnosticOptions(options: PageFlowOptions['diagnostics'] = {}) {
  const positiveNumber = (value: number | undefined, fallback: number) => Number.isFinite(value) && value! > 0 ? value! : fallback
  return {
    minimumFontSize: positiveNumber(options.minimumFontSize, 12),
    minimumTapSize: positiveNumber(options.minimumTapSize, 44),
    ignoreSelectors: [...new Set((options.ignoreSelectors ?? []).map(selector => selector.trim()).filter(Boolean))],
    rules: options.rules ?? {},
  }
}

function resolveApiDiagnosticOptions(options: PageFlowOptions['apiDiagnostics'] = {}) {
  const nonNegativeNumber = (value: number | undefined, fallback: number) => Number.isFinite(value) && value! >= 0 ? value! : fallback
  return {
    slowRequestMs: nonNegativeNumber(options.slowRequestMs, 1_000),
    largeResponseBytes: nonNegativeNumber(options.largeResponseBytes, 500_000),
    duplicateWindowMs: nonNegativeNumber(options.duplicateWindowMs, 1_000),
  }
}

function resolveOptions(options: PageFlowOptions = {}): ResolvedPageFlowOptions {
  return {
    enabled: options.enabled ?? true,
    framework: options.framework ?? 'auto',
    routes: options.routes ?? [],
    previewPath: normalizePreviewPath(options.previewPath ?? '/__unplugin-pageflow/'),
    appUrl: options.appUrl ?? '/',
    dynamicParams: options.dynamicParams ?? {},
    previewRoles: options.previewRoles ?? [],
    groupNames: options.groupNames ?? {},
    pageTests: options.pageTests ?? {},
    testCommands: options.testCommands ?? {},
    diagnostics: resolveDiagnosticOptions(options.diagnostics),
    apiDiagnostics: resolveApiDiagnosticOptions(options.apiDiagnostics),
  }
}

async function loadProjectOptions(root: string, options: PageFlowOptions = {}) {
  const file = resolve(root, '.pageflow')
  let stored: PageFlowOptions = {}
  try {
    stored = JSON.parse(stripJsonComments(await readFile(file, 'utf8'))) as PageFlowOptions
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw error
    await writeFile(file, `${JSON.stringify(resolveOptions(options), null, 2)}\n`, { flag: 'wx' })
  }
  return resolveOptions({
    ...stored,
    ...options,
    dynamicParams: options.dynamicParams ?? stored.dynamicParams,
    routes: options.routes ?? stored.routes,
    previewRoles: options.previewRoles ?? stored.previewRoles,
    groupNames: options.groupNames ?? stored.groupNames,
    pageTests: options.pageTests ?? stored.pageTests,
    testCommands: options.testCommands ?? stored.testCommands,
    diagnostics: {
      ...stored.diagnostics,
      ...options.diagnostics,
      rules: { ...stored.diagnostics?.rules, ...options.diagnostics?.rules },
    },
    apiDiagnostics: { ...stored.apiDiagnostics, ...options.apiDiagnostics },
  })
}

function stripJsonComments(source: string) {
  let result = ''
  let inString = false
  let quote = ''
  let escaped = false
  for (let index = 0; index < source.length; index++) {
    const character = source[index]
    const next = source[index + 1]
    if (inString) {
      result += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) inString = false
    } else if (character === '"' || character === "'") {
      inString = true
      quote = character
      result += character
    } else if (character === '/' && next === '/') {
      while (index + 1 < source.length && source[index + 1] !== '\n') index++
    } else if (character === '/' && next === '*') {
      index += 2
      while (index + 1 < source.length && !(source[index] === '*' && source[index + 1] === '/')) index++
      index++
    } else result += character
  }
  return result
}

async function readUniAppConfig(root: string) {
  for (const file of [resolve(root, 'src/pages.json'), resolve(root, 'pages.json')]) {
    try {
      type PageConfig = { path?: unknown, style?: { navigationBarTitleText?: unknown } }
      type SubPackageConfig = { root?: unknown, pages?: PageConfig[] }
      const config = JSON.parse(stripJsonComments(await readFile(file, 'utf8'))) as {
        pages?: PageConfig[]
        subPackages?: SubPackageConfig[]
        subpackages?: SubPackageConfig[]
        tabBar?: { list?: Array<{ pagePath?: unknown }> }
      }
      const normalizePath = (path: string) => `/${path.replace(/^\/+|\/+$/g, '')}`
      const titlesByPath = new Map<string, string>()
      const routeOrderByPath = new Map<string, number>()
      const addPage = (page: PageConfig, packageRoot = '') => {
        if (typeof page.path !== 'string' || !page.path.trim()) return
        const path = normalizePath(`${packageRoot}/${page.path}`)
        routeOrderByPath.set(path, routeOrderByPath.size)
        const title = page.style?.navigationBarTitleText
        if (typeof title === 'string' && title.trim())
          titlesByPath.set(path, title.trim())
      }
      config.pages?.forEach(page => addPage(page))
      ;[...(config.subPackages ?? []), ...(config.subpackages ?? [])].forEach(pkg => {
        const packageRoot = typeof pkg.root === 'string' ? pkg.root : ''
        pkg.pages?.forEach(page => addPage(page, packageRoot))
      })
      const home = config.pages?.[0]?.path
      return {
        homePath: typeof home === 'string' && home.trim() ? normalizePath(home) : undefined,
        titlesByPath,
        routeOrderByPath,
        tabPaths: new Set((config.tabBar?.list ?? []).flatMap(item => typeof item.pagePath === 'string' ? [normalizePath(item.pagePath)] : [])),
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  return { homePath: undefined, titlesByPath: new Map<string, string>(), routeOrderByPath: new Map<string, number>(), tabPaths: new Set<string>() }
}

function createGraph(
  routes: PageFlowRuntimeRoute[],
  reportedPages: Map<string, PageFlowRuntimePage>,
  staticLinksByFile: Map<string, PageFlowRuntimeLink[]>,
  staticDiagnosticsByFile: Map<string, import('../shared/types.ts').PageFlowDiagnostic[]>,
  configuredTitlesByPath: Map<string, string>,
  routeOrderByPath: Map<string, number>,
  sourceRevisionsByFile: Map<string, string>,
  tabPaths: Set<string>,
  diagnosticRules: Record<string, boolean>,
  version: number,
  routeMode: PageFlowRouteMode,
  projectRoot: string,
  uniAppHomePath?: string,
): PageFlowGraph {
  const projectSourceFile = (file: string | undefined) => {
    if (!file) return undefined
    const relativeFile = normalizeFile(relative(projectRoot, resolve(projectRoot, file)))
    return relativeFile === '..' || relativeFile.startsWith('../') || isAbsolute(relativeFile) ? undefined : relativeFile
  }
  const sourceEntryForPath = <T>(entries: Map<string, T>, path: string) => {
    const suffix = `/src${path}.vue`
    return [...entries.entries()].find(([file]) => file.endsWith(suffix))?.[1]
  }
  const hasRootRoute = routes.some(route => route.path === '/')
  const hiddenHomePath = hasRootRoute ? uniAppHomePath : undefined
  const seenPaths = new Set<string>()
  const pages: PageFlowPage[] = routes
    .filter(route => route.path && route.path !== hiddenHomePath && !seenPaths.has(route.path) && seenPaths.add(route.path))
    .map((route, index) => {
      const configuredPath = route.path === '/' && hiddenHomePath ? hiddenHomePath : route.path
      const configuredTitle = configuredTitlesByPath.get(configuredPath)
      const configuredPage = routeOrderByPath.has(configuredPath)
      return {
        id: route.id,
        title: configuredTitle ?? (configuredPage ? '' : reportedPages.get(route.path)?.title || route.title),
        path: route.path,
        sourceFile: projectSourceFile(route.componentFile),
        routeOrder: routeOrderByPath.get(route.path)
          ?? (route.path === '/' && hiddenHomePath ? routeOrderByPath.get(hiddenHomePath) : undefined),
        revision: sourceEntryForPath(sourceRevisionsByFile, configuredPath)
          ?? (route.componentFile
            ? [...sourceRevisionsByFile.entries()].find(([file]) => file === route.componentFile || file.endsWith(route.componentFile!))?.[1]
            : undefined)
          ?? route.path,
        accent: ACCENTS[index % ACCENTS.length],
        links: [],
        diagnostics: sourceEntryForPath(staticDiagnosticsByFile, configuredPath)
          ?? (route.componentFile
            ? [...staticDiagnosticsByFile.entries()].find(([file]) => file === route.componentFile || file.endsWith(route.componentFile!))?.[1]
            : undefined)
          ?? [],
      }
    })
  const idsByPath = new Map(pages.map(page => [page.path, page.id]))
  const routesById = new Map(routes.map(route => [route.id, route]))

  const resolveTarget = (path: string) => {
    const normalizedPath = path.split(/[?#]/, 1)[0]
    if (normalizedPath === hiddenHomePath) return idsByPath.get('/')
    const exact = idsByPath.get(normalizedPath)
    if (exact) return exact
    const targetSegments = normalizedPath.split('/')
    return pages.find(page => {
      const routeSegments = page.path.split('/')
      return routeSegments.length === targetSegments.length
        && routeSegments.every((segment, index) => segment.startsWith(':') || segment === targetSegments[index])
    })?.id
  }

  pages.forEach(page => {
    const componentFile = routesById.get(page.id)?.componentFile
    const sourcePath = page.path === '/' && hiddenHomePath ? hiddenHomePath : page.path
    const staticLinks = componentFile
      ? sourceEntryForPath(staticLinksByFile, sourcePath)
        ?? [...staticLinksByFile.entries()].find(([file]) => file === componentFile || file.endsWith(componentFile))?.[1]
        ?? []
      : sourceEntryForPath(staticLinksByFile, sourcePath) ?? []
    const links = new Map<string, PageFlowPage['links'][number]>()
    ;[...staticLinks, ...(reportedPages.get(page.path)?.links ?? [])].forEach(link => {
      const target = resolveTarget(link.to)
      if (!target) return
      const hotspotKey = link.hotspot
        ? `${link.hotspot.centerX}:${link.hotspot.centerY}`
        : 'static'
      links.set(`${target}:${hotspotKey}:${link.location ?? ''}`, { label: link.label, to: target, location: link.location, hotspot: link.hotspot })
    })
    page.links = [...links.values()]
    const navigationDiagnostics: import('../shared/types.ts').PageFlowDiagnostic[] = []
    for (const item of page.diagnostics ?? []) {
      const navigation = item.navigation
      if (!navigation) continue
      const targetPath = navigation.target.split(/[?#]/, 1)[0]
      if (!resolveTarget(targetPath) && diagnosticRules['invalid-navigation-target'] !== false) {
        navigationDiagnostics.push({
          ...item,
          id: `invalid-navigation-target:${item.id}`,
          ruleId: 'invalid-navigation-target',
          severity: 'error',
          title: '跳转目标不存在',
          description: `项目路由中没有找到 ${targetPath}，请检查路径或页面是否已删除。`,
        })
      }
      const targetsTab = tabPaths.has(targetPath)
      const wrongTabMethod = navigation.method === 'switchTab' ? !targetsTab : navigation.method === 'navigateTo' ? targetsTab : false
      if (wrongTabMethod && diagnosticRules['navigation-method-mismatch'] !== false) {
        navigationDiagnostics.push({
          ...item,
          id: `navigation-method-mismatch:${item.id}`,
          ruleId: 'navigation-method-mismatch',
          severity: 'warning',
          title: '导航方法与目标页面不匹配',
          description: navigation.method === 'switchTab'
            ? `${targetPath} 不是 Tab 页面，不应使用 switchTab。`
            : `${targetPath} 是 Tab 页面，应使用 switchTab。`,
        })
      }
    }
    page.diagnostics = [...(page.diagnostics ?? []), ...navigationDiagnostics]
  })

  return { pages, routeMode, version }
}

function normalizeFile(id: string) {
  return id.split('?')[0].replaceAll('\\', '/')
}

function toViteFsPath(url: URL) {
  const pathname = decodeURIComponent(url.pathname)
    .replace(/^\/([A-Za-z]:\/)/, '$1')
    .replaceAll('\\', '/')
  return `/@fs/${pathname}`
}

function extractStaticLinks(code: string) {
  const links: PageFlowRuntimeLink[] = []
  const routerNames = new Set(['router', '$router'])
  for (const match of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*useRouter\s*\(\s*\)/g))
    routerNames.add(match[1])
  const callers = [...routerNames]
    .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const routerCall = `(?:(?<![\\w$])(?:${callers})(?![\\w$])|useRouter\\(\\s*\\))`
  const calls = new RegExp(`${routerCall}\\s*\\.\\s*(push|replace)\\s*\\(\\s*(["'\\\`])([^"'\\\`]+)\\2`, 'g')
  const objectCalls = new RegExp(`${routerCall}\\s*\\.\\s*(push|replace)\\s*\\(\\s*\\{\\s*path\\s*:\\s*(["'])\\s*([^"']+)\\2`, 'g')
  const uniCalls = /\buni\s*\.\s*(navigateTo|redirectTo|switchTab|reLaunch)\s*\(\s*\{\s*url\s*:\s*(["'`])([^"'`]+)\2/g
  for (const pattern of [calls, objectCalls, uniCalls]) {
    for (const match of code.matchAll(pattern)) {
      const target = match[3].split('${', 1)[0].split('?', 1)[0]
      if (!target.startsWith('/') || target.endsWith('/')) continue
      links.push({ label: `${match[1]} ${target}`, to: target })
    }
  }
  return links
}

async function readJson(request: AsyncIterable<Uint8Array | string>) {
  let body = ''
  for await (const chunk of request) {
    body += chunk.toString()
    if (body.length > 1_000_000) throw new Error('Request body is too large')
  }

  return JSON.parse(body) as Record<string, unknown>
}

async function readBinary(request: AsyncIterable<Uint8Array | string>, maximumBytes = 16_000_000) {
  const chunks: Uint8Array[] = []
  let length = 0
  for await (const chunk of request) {
    const data = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    length += data.byteLength
    if (length > maximumBytes) throw new Error('Thumbnail is too large')
    chunks.push(data)
  }
  return Buffer.concat(chunks)
}

async function readRoutes(request: AsyncIterable<Uint8Array | string>) {
  const value = await readJson(request)
  if (!Array.isArray(value.routes)) throw new Error('routes must be an array')

  const routes = value.routes.filter((route): route is PageFlowRuntimeRoute => {
    if (!route || typeof route !== 'object') return false
    const candidate = route as Partial<PageFlowRuntimeRoute>
    return typeof candidate.id === 'string'
      && typeof candidate.path === 'string'
      && typeof candidate.title === 'string'
  })
  const routeMode: PageFlowRouteMode = value.routeMode === 'hash' ? 'hash' : 'history'
  return { routeMode, routes }
}

async function readPage(request: AsyncIterable<Uint8Array | string>): Promise<PageFlowRuntimePage> {
  const value = await readJson(request)
  if (typeof value.path !== 'string' || (value.links != null && !Array.isArray(value.links)))
    throw new Error('path is required and links must be an array')

  const links = Array.isArray(value.links) ? value.links.filter((link): link is PageFlowRuntimeLink => {
    if (!link || typeof link !== 'object') return false
    const candidate = link as Partial<PageFlowRuntimeLink>
    return typeof candidate.label === 'string' && typeof candidate.to === 'string'
  }) : undefined
  const title = typeof value.title === 'string' && value.title.trim() ? value.title.trim() : undefined
  return { path: value.path, title, links }
}

function pageflowHtml(base = '/', styleUrl?: string, versionUrl?: string, clientVersion?: string) {
  const clientUrl = `${base.endsWith('/') ? base : `${base}/`}@id/${PAGEFLOW_CLIENT_ID}${clientVersion ? `?v=${encodeURIComponent(clientVersion)}` : ''}`
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>unplugin-pageflow</title>
    ${styleUrl ? `<link rel="stylesheet" href="${styleUrl}" />` : ''}
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${clientUrl}"></script>
    ${versionUrl ? `<script>
      let pageflowClientVersion;
      setInterval(async () => {
        try {
          const response = await fetch('${versionUrl}', { cache: 'no-store' });
          const version = await response.text();
          if (pageflowClientVersion && version !== pageflowClientVersion) location.reload();
          pageflowClientVersion = version;
        } catch {}
      }, 1000);
    </script>` : ''}
  </body>
</html>`
}

const factory: UnpluginFactory<PageFlowOptions | undefined> = (options) => {
  const resolved = resolveOptions(options)
  let pluginRoot: string
  try {
    pluginRoot = resolve(dirname(createRequire(import.meta.url).resolve('unplugin-pageflow')), '../..')
  } catch {
    let current = resolve(process.cwd())
    while (true) {
      try {
        if (JSON.parse(readFileSync(resolve(current, 'package.json'), 'utf8')).name === 'unplugin-pageflow') break
      } catch {}
      const parent = dirname(current)
      if (parent === current) {
        current = resolve(fileURLToPath(new URL('../..', import.meta.url)))
        break
      }
      current = parent
    }
    pluginRoot = current
  }
  const pluginDist = `${normalizeFile(resolve(pluginRoot, 'dist'))}/`
  const moduleFile = normalizeFile(fileURLToPath(import.meta.url))
  const packaged = moduleFile.includes('/dist/')
  const builtClientEntryFile = resolve(pluginRoot, 'dist/client/mount.js')
  const useBuiltClient = packaged || existsSync(builtClientEntryFile)
  const clientEntryFile = useBuiltClient ? builtClientEntryFile : resolve(pluginRoot, 'src/client/mount.ts')
  const clientEntry = toViteFsPath(pathToFileURL(clientEntryFile))
  const runtimeEntry = toViteFsPath(pathToFileURL(resolve(pluginRoot, packaged ? 'dist/runtime/client.js' : 'src/runtime/client.ts')))
  const clientStyleFile = useBuiltClient ? resolve(pluginRoot, 'dist/style.css') : undefined
  const clientFiles = [clientEntryFile, clientStyleFile].filter((file): file is string => Boolean(file))
  const getClientVersion = async () => {
    const versions = await Promise.all(clientFiles.map(file => stat(file).then(info => info.mtimeMs).catch(() => 0)))
    return String(Math.max(...versions))
  }
  let graph: PageFlowGraph = { pages: [], routeMode: 'history', version: 0 }
  let projectRoot = pluginRoot
  let routes: PageFlowRuntimeRoute[] = []
  let routeMode: PageFlowRouteMode = 'history'
  let uniAppHomePath: string | undefined
  let configuredTitlesByPath = new Map<string, string>()
  let routeOrderByPath = new Map<string, number>()
  let tabPaths = new Set<string>()
  const reportedPages = new Map<string, PageFlowRuntimePage>()
  const staticLinksByFile = new Map<string, PageFlowRuntimeLink[]>()
  const staticDiagnosticsByFile = new Map<string, import('../shared/types.ts').PageFlowDiagnostic[]>()
  const sourceRevisionsByFile = new Map<string, string>()
  const eventResponses = new Set<ServerResponse>()
  let cachedClientStyle: Buffer | undefined
  let sendGraphUpdate: ((graph: PageFlowGraph) => void) | undefined
  let sendPageUpdate: ((page: PageFlowPage) => void) | undefined
  let pageTestIndex: PageTestIndex | undefined
  let pageTestIndexReady: Promise<void> = Promise.resolve()
  let pageTestIndexScanned = false
  let pageTestResultCache: ReturnType<typeof createPageTestResultCache> | undefined
  const runningPageTests = new Map<string, ChildProcess>()
  const cancelledPageTests = new Set<string>()
  const aiContexts = new Map<string, unknown>()

  const ensurePageTestIndex = () => {
    if (!pageTestIndex || pageTestIndexScanned) return pageTestIndexReady
    pageTestIndexScanned = true
    pageTestIndexReady = pageTestIndex.scan().catch(error => {
      pageTestIndexScanned = false
      throw error
    })
    return pageTestIndexReady
  }

  const rebuildGraph = (updatedPath?: string) => {
    graph = createGraph(routes, reportedPages, staticLinksByFile, staticDiagnosticsByFile, configuredTitlesByPath, routeOrderByPath, sourceRevisionsByFile, tabPaths, resolved.diagnostics.rules, graph.version + 1, routeMode, projectRoot, uniAppHomePath)
    if (updatedPath) {
      const page = graph.pages.find(item => item.path === updatedPath)
      if (page) sendPageUpdate?.(page)
    } else sendGraphUpdate?.(graph)
  }

  const recordSource = (code: string, id: string) => {
    const file = normalizeFile(id)
    const nextLinks = extractStaticLinks(code)
    const nextDiagnostics = extractEventNavigationDiagnostics(code, file)
      .filter(item => resolved.diagnostics.rules[item.ruleId] !== false)
    const currentLinks = staticLinksByFile.get(file) ?? []
    const currentDiagnostics = staticDiagnosticsByFile.get(file) ?? []
    const nextRevision = createHash('sha256').update(code).digest('hex').slice(0, 16)
    const linksChanged = JSON.stringify(currentLinks) !== JSON.stringify(nextLinks)
    const diagnosticsChanged = JSON.stringify(currentDiagnostics) !== JSON.stringify(nextDiagnostics)
    const revisionChanged = sourceRevisionsByFile.get(file) !== nextRevision
    if (!linksChanged && !diagnosticsChanged && !revisionChanged) return false
    if (nextLinks.length) staticLinksByFile.set(file, nextLinks)
    else staticLinksByFile.delete(file)
    if (nextDiagnostics.length) staticDiagnosticsByFile.set(file, nextDiagnostics)
    else staticDiagnosticsByFile.delete(file)
    sourceRevisionsByFile.set(file, nextRevision)
    return true
  }

  const scanVueSources = async (directory: string) => {
    let changed = false
    const scan = async (current: string) => {
      for (const entry of await readdir(current, { withFileTypes: true })) {
        const file = resolve(current, entry.name)
        if (entry.isDirectory()) await scan(file)
        else if (entry.isFile() && entry.name.endsWith('.vue'))
          changed = recordSource(await readFile(file, 'utf8'), file) || changed
      }
    }
    try {
      await scan(directory)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return
    }
    if (changed && routes.length) rebuildGraph()
  }

  const sendEvent = (event: string, data: unknown) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    eventResponses.forEach(response => response.write(message))
  }

  return {
    name: 'unplugin-pageflow',
    enforce: 'pre',
    resolveId(id) {
      if (id === PAGEFLOW_CONFIG_ID) return PAGEFLOW_CONFIG_RESOLVED_ID
      if (id === PAGEFLOW_CLIENT_ID || id.startsWith(`${PAGEFLOW_CLIENT_ID}?`))
        return `${PAGEFLOW_CLIENT_RESOLVED_ID}${id.slice(PAGEFLOW_CLIENT_ID.length)}`
      if (id === PAGEFLOW_RUNTIME_ID) return PAGEFLOW_RUNTIME_RESOLVED_ID
    },
    load(id) {
      if (id === PAGEFLOW_CONFIG_RESOLVED_ID)
        return `export default ${JSON.stringify(resolved)}`
      if (id === PAGEFLOW_CLIENT_RESOLVED_ID || id.startsWith(`${PAGEFLOW_CLIENT_RESOLVED_ID}?`)) {
        const versionQuery = id.slice(PAGEFLOW_CLIENT_RESOLVED_ID.length)
        return `import config from '${PAGEFLOW_CONFIG_ID}'; import { mountPageFlow } from '${clientEntry}${versionQuery}'; mountPageFlow(document.querySelector('#app'), config)`
      }
      if (id === PAGEFLOW_RUNTIME_RESOLVED_ID && resolved.framework === 'qwik-city')
        return `import config from '${PAGEFLOW_CONFIG_ID}'; if (typeof window !== 'undefined') import('${runtimeEntry}').then(({ startPageFlowRuntime }) => startPageFlowRuntime(config))`
      if (id === PAGEFLOW_RUNTIME_RESOLVED_ID)
        return `import config from '${PAGEFLOW_CONFIG_ID}'; import { startPageFlowRuntime } from '${runtimeEntry}'; startPageFlowRuntime(config)`
    },
    transform(code, id) {
      if (!id.endsWith('.vue')) return
      if (recordSource(code, id) && routes.length) rebuildGraph()
    },
    vite: {
      apply: 'serve',
      config(config) {
        const ignored = config.server?.watch?.ignored
        const normalizedPluginDist = normalizeFile(pluginDist)
        return {
          server: {
            watch: {
              ignored: [
                ...(ignored == null ? [] : Array.isArray(ignored) ? ignored : [ignored]),
                `${pluginDist}**`,
                // Chokidar's glob matching is inconsistent for absolute
                // Windows paths. Use a predicate so PageFlow's own build
                // output can never feed back into the host HMR graph.
                (file: string) => {
                  const normalizedFile = normalizeFile(file)
                  return normalizedFile === normalizedPluginDist
                    || normalizedFile.startsWith(`${normalizedPluginDist}/`)
                },
                '**/.unplugin-pageflow/cache/**',
                '**/.pageflow',
              ],
            },
          },
        }
      },
      handleHotUpdate(context) {
        const file = normalizeFile(context.file)
        if (`${file}/`.startsWith(pluginDist) || file.includes('/.unplugin-pageflow/cache/')) return []
        if (isPageFlowTestFile(file) && pageTestIndex && pageTestIndexScanned) {
          pageTestIndexReady = pageTestIndex.update(file).then(() => sendEvent(PAGEFLOW_TEST_EVENT, { file }))
          return []
        }
      },
      transformIndexHtml: {
        order: 'pre',
        handler(_html, context) {
          if (!resolved.enabled || resolved.framework === 'nuxt' || resolved.framework === 'qwik-city' || context.path?.startsWith(resolved.previewPath)) return
          return [{
            tag: 'script',
            attrs: { type: 'module' },
            children: `import '${PAGEFLOW_RUNTIME_ID}'`,
            injectTo: 'head-prepend',
          }]
        },
      },
      async configureServer(server) {
        projectRoot = resolve(options?.projectRoot ?? server.config.root)
        if (projectRoot !== pluginRoot || packaged) {
          try {
            Object.assign(resolved, await loadProjectOptions(projectRoot, options))
          } catch (error) {
            server.config.logger.warn(`unplugin-pageflow could not read .pageflow: ${error instanceof Error ? error.message : error}`)
          }
        }
        if (!resolved.enabled) return
        try {
          const uniAppConfig = await readUniAppConfig(projectRoot)
          uniAppHomePath = uniAppConfig.homePath
          if (resolved.framework === 'auto' && uniAppHomePath) resolved.framework = 'uni-app'
          configuredTitlesByPath = uniAppConfig.titlesByPath
          routeOrderByPath = uniAppConfig.routeOrderByPath
          tabPaths = uniAppConfig.tabPaths
        } catch (error) {
          server.config.logger.warn(`unplugin-pageflow could not read pages.json: ${error instanceof Error ? error.message : error}`)
        }
        void Promise.all([resolve(projectRoot, 'src'), resolve(projectRoot, 'app')].map(scanVueSources)).catch(error =>
          server.config.logger.warn(`unplugin-pageflow could not scan Vue sources: ${error instanceof Error ? error.message : error}`),
        )
        const thumbnailCache = createThumbnailCache(resolve(projectRoot, '.unplugin-pageflow/cache'))
        pageTestResultCache = createPageTestResultCache(resolve(projectRoot, '.unplugin-pageflow/cache'))
        sendGraphUpdate = nextGraph => {
          server.ws.send({ type: 'custom', event: PAGEFLOW_GRAPH_EVENT, data: nextGraph })
          sendEvent(PAGEFLOW_GRAPH_EVENT, nextGraph)
        }
        sendPageUpdate = page => {
          server.ws.send({ type: 'custom', event: PAGEFLOW_PAGE_EVENT, data: page })
          sendEvent(PAGEFLOW_PAGE_EVENT, page)
        }
        if (resolved.routes.length) {
          routes = resolved.routes
          rebuildGraph()
        }
        pageTestIndex = new PageTestIndex(projectRoot, routes, resolved.pageTests)
        let lighthouseRunning = false

        server.middlewares.use(async (request, response, next) => {
          const requestUrl = new URL(request.url ?? '/', 'http://unplugin-pageflow.local')
          const pathname = requestUrl.pathname
          const graphPath = `${resolved.previewPath}api/graph`
          const eventsPath = `${resolved.previewPath}api/events`
          const routesPath = `${resolved.previewPath}api/routes`
          const pagePath = `${resolved.previewPath}api/page`
          const thumbnailsPath = `${resolved.previewPath}api/thumbnails`
          const thumbnailPath = `${resolved.previewPath}api/thumbnail`
          const stylePath = `${resolved.previewPath}style.css`
          const clientVersionPath = `${resolved.previewPath}api/client-version`
          const groupNamePath = `${resolved.previewPath}api/group-name`
          const testsPath = `${resolved.previewPath}api/tests`
          const lighthousePath = `${resolved.previewPath}api/lighthouse`
          const aiContextPath = `${resolved.previewPath}api/ai-context`

          if (pathname === aiContextPath && request.method === 'GET') {
            const pagePath = requestUrl.searchParams.get('path') ?? ''
            const context = aiContexts.get(pagePath)
            if (!context) {
              response.statusCode = 404
              response.end('No AI context is available for this page')
              return
            }
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.setHeader('Cache-Control', 'no-store')
            response.end(JSON.stringify(context))
            return
          }

          if (pathname === aiContextPath && request.method === 'POST') {
            try {
              const context = await readJson(request)
              const page = context.page && typeof context.page === 'object' ? context.page as Record<string, unknown> : undefined
              const pagePath = typeof page?.path === 'string' ? page.path : ''
              if (!pagePath.startsWith('/') || pagePath.startsWith('//')) throw new Error('A local page path is required')
              aiContexts.set(pagePath, context)
              response.statusCode = 204
              response.end()
            } catch (error) {
              response.statusCode = 400
              response.end(error instanceof Error ? error.message : 'Invalid AI context')
            }
            return
          }

          if (pathname === lighthousePath && request.method === 'POST') {
            if (lighthouseRunning) {
              response.statusCode = 409
              response.end('A Lighthouse audit is already running')
              return
            }
            lighthouseRunning = true
            try {
              const body = await readJson(request)
              const pageLocation = typeof body.path === 'string' ? body.path.trim() : ''
              if (!pageLocation.startsWith('/') || pageLocation.startsWith('//')) throw new Error('A local page path is required')
              const sessionValue = body.session && typeof body.session === 'object' ? body.session as Record<string, unknown> : undefined
              if (sessionValue && JSON.stringify(sessionValue).length > 262_144) throw new Error('Lighthouse session data is too large')
              const validStorage = (value: unknown): value is Record<string, string> => Boolean(value)
                && typeof value === 'object'
                && !Array.isArray(value)
                && Object.entries(value as Record<string, unknown>).length <= 500
                && Object.entries(value as Record<string, unknown>).every(([key, item]) => key.length <= 500 && typeof item === 'string')
              if (sessionValue && (!validStorage(sessionValue.localStorage) || !validStorage(sessionValue.sessionStorage)))
                throw new Error('Invalid Lighthouse session data')
              const session = sessionValue as PageFlowLighthouseSession | undefined
              const protocol = server.config.server.https ? 'https' : 'http'
              const host = request.headers.host
              if (!host) throw new Error('Could not determine the development server address')
              const report = await runPageFlowLighthouse(new URL(pageLocation, `${protocol}://${host}`).href, session, request.headers.cookie)
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify(report))
            } catch (error) {
              response.statusCode = 500
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Lighthouse audit failed' }))
            } finally {
              lighthouseRunning = false
            }
            return
          }

          if (pathname === testsPath && request.method === 'GET') {
            try {
              await ensurePageTestIndex()
            } catch (error) {
              server.config.logger.warn(`unplugin-pageflow could not scan page tests: ${error instanceof Error ? error.message : error}`)
              response.statusCode = 500
              response.end('Could not scan page tests')
              return
            }
            const pagePath = requestUrl.searchParams.get('path') ?? ''
            const tests = await Promise.all((pageTestIndex?.testsFor(pagePath) ?? []).map(async test => ({
              ...test,
              ...await pageTestResultCache?.read(test),
              runnable: Boolean(resolved.testCommands[test.kind]),
            })))
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify(tests))
            return
          }

          if (pathname === `${testsPath}/run` && request.method === 'POST') {
            let runId = ''
            try {
              await ensurePageTestIndex()
              const body = await readJson(request)
              const pagePath = typeof body.path === 'string' ? body.path : ''
              const id = typeof body.id === 'string' ? body.id : ''
              runId = id
              const test = pageTestIndex?.testsFor(pagePath).find(item => item.id === id)
              if (!test) throw new Error('Unknown page test')
              const command = resolved.testCommands[test.kind]
              if (!command?.command) throw new Error(`No ${test.kind} test command configured`)
              if (runningPageTests.has(id)) {
                response.statusCode = 409
                response.end('Test is already running')
                return
              }

              const startedAt = Date.now()
              const values = { file: resolve(projectRoot, test.file), name: test.name }
              const interpolate = (value: string) => value.replaceAll('{file}', values.file).replaceAll('{name}', values.name)
              const child = spawn(command.command, (command.args ?? []).map(interpolate), {
                cwd: projectRoot,
                env: process.env,
                shell: false,
                windowsHide: true,
                detached: process.platform !== 'win32',
              })
              runningPageTests.set(id, child)
              let output = ''
              const stdoutDecoder = new StringDecoder('utf8')
              const stderrDecoder = new StringDecoder('utf8')
              const append = (chunk: string) => { output = `${output}${chunk}`.slice(-100_000) }
              child.stdout.on('data', chunk => append(stdoutDecoder.write(chunk)))
              child.stderr.on('data', chunk => append(stderrDecoder.write(chunk)))
              const timeoutMs = Math.min(Math.max(command.timeoutMs ?? 120_000, 1_000), 1_800_000)
              let timedOut = false
              const timeout = setTimeout(() => {
                timedOut = true
                append(`\nPageFlow stopped this test after ${timeoutMs}ms.`)
                void terminateProcessTree(child)
              }, timeoutMs)
              const exitCode = await new Promise<number>((resolveExit, reject) => {
                child.once('error', reject)
                child.once('close', code => resolveExit(code ?? 1))
              }).finally(() => clearTimeout(timeout))
              append(stdoutDecoder.end())
              append(stderrDecoder.end())
              const cancelled = cancelledPageTests.has(id)
              if (cancelled) append('\nPageFlow cancelled this test.')
              const result = {
                status: cancelled ? 'skipped' as const : !timedOut && exitCode === 0 ? 'passed' as const : 'failed' as const,
                duration: Date.now() - startedAt,
                output: stripVTControlCharacters(output).trim(),
              }
              await pageTestResultCache?.write(test, result).catch(error =>
                server.config.logger.warn(`unplugin-pageflow could not persist a test result: ${error instanceof Error ? error.message : error}`),
              )
              sendEvent(PAGEFLOW_TEST_EVENT, { path: pagePath, id, result })
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify(result))
            } catch (error) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not run page test' }))
            } finally {
              if (runId) {
                runningPageTests.delete(runId)
                cancelledPageTests.delete(runId)
              }
            }
            return
          }

          if (pathname === `${testsPath}/cancel` && request.method === 'POST') {
            try {
              const body = await readJson(request)
              const id = typeof body.id === 'string' ? body.id : ''
              const child = runningPageTests.get(id)
              if (!id || !child) {
                response.statusCode = 404
                response.end('Page test is not running')
                return
              }
              cancelledPageTests.add(id)
              await terminateProcessTree(child)
              response.statusCode = 202
              response.end()
            } catch (error) {
              response.statusCode = 400
              response.end(error instanceof Error ? error.message : 'Could not cancel page test')
            }
            return
          }

          if (pathname === groupNamePath && request.method === 'POST') {
            try {
              const body = await readJson(request)
              const key = typeof body.key === 'string' ? body.key.trim() : ''
              const name = typeof body.name === 'string' ? body.name.trim() : ''
              if (!key || key.length > 300) throw new Error('Invalid group key')
              if (name.length > 80) throw new Error('Group name is too long')
              const configFile = resolve(projectRoot, '.pageflow')
              const stored = JSON.parse(stripJsonComments(await readFile(configFile, 'utf8'))) as PageFlowOptions
              const groupNames = { ...(stored.groupNames ?? {}) }
              if (name) groupNames[key] = name
              else delete groupNames[key]
              stored.groupNames = groupNames
              await writeFile(configFile, `${JSON.stringify(stored, null, 2)}\n`)
              resolved.groupNames = groupNames
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ key, name }))
            } catch (error) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }))
            }
            return
          }

          if (pathname === clientVersionPath && request.method === 'GET') {
            response.setHeader('Content-Type', 'text/plain; charset=utf-8')
            response.setHeader('Cache-Control', 'no-store')
            response.end(await getClientVersion())
            return
          }

          if (pathname === stylePath && request.method === 'GET' && clientStyleFile) {
            response.setHeader('Content-Type', 'text/css; charset=utf-8')
            response.setHeader('Cache-Control', 'no-cache')
            try {
              cachedClientStyle = await readFile(clientStyleFile)
              response.end(cachedClientStyle)
            } catch (error) {
              // `vite build --watch` replaces dist atomically by cleaning it
              // first. Keep the host dev server alive while style.css is
              // briefly absent and serve the last complete stylesheet.
              if (cachedClientStyle) response.end(cachedClientStyle)
              else {
                response.statusCode = 503
                response.setHeader('Retry-After', '1')
                response.end('/* unplugin-pageflow client is rebuilding */')
              }
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
                server.config.logger.warn(`unplugin-pageflow could not read client style: ${error instanceof Error ? error.message : error}`)
            }
            return
          }

          if (pathname === eventsPath && request.method === 'GET') {
            response.statusCode = 200
            response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
            response.setHeader('Cache-Control', 'no-cache, no-transform')
            response.setHeader('Connection', 'keep-alive')
            response.write(': connected\n\n')
            eventResponses.add(response)
            request.on('close', () => eventResponses.delete(response))
            return
          }

          if (pathname === graphPath && request.method === 'GET') {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify(graph))
            return
          }

          if (pathname === thumbnailsPath && request.method === 'GET') {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.end(JSON.stringify(await thumbnailCache.manifest()))
            return
          }

          if (pathname === thumbnailPath && request.method === 'GET') {
            const slot = requestUrl.searchParams.get('slot')
            const cached = slot ? await thumbnailCache.read(slot) : undefined
            if (!cached) {
              response.statusCode = 404
              response.end()
              return
            }
            response.setHeader('Content-Type', cached.record.mimeType)
            response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            response.end(cached.data)
            return
          }

          if (pathname === thumbnailPath && request.method === 'POST') {
            try {
              const slot = requestUrl.searchParams.get('slot')
              const revision = requestUrl.searchParams.get('revision')
              const width = Number(requestUrl.searchParams.get('width'))
              const height = Number(requestUrl.searchParams.get('height'))
              const optionalNumber = (name: string) => {
                const value = requestUrl.searchParams.get(name)
                return value == null ? undefined : Number(value)
              }
              const pageHeight = optionalNumber('pageHeight')
              const tileCount = optionalNumber('tileCount')
              const tileIndex = optionalNumber('tileIndex')
              const tileTop = optionalNumber('tileTop')
              const mimeType = request.headers['content-type']?.split(';')[0]
              if (!slot || slot.length > 500 || !revision || revision.length > 200)
                throw new Error('slot and revision are required')
              if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0)
                throw new Error('width and height must be positive numbers')
              if ([pageHeight, tileCount, tileIndex, tileTop].some(value => value != null && (!Number.isFinite(value) || value < 0)))
                throw new Error('Invalid thumbnail tile metadata')
              if (!mimeType || !['image/webp', 'image/jpeg', 'image/png'].includes(mimeType))
                throw new Error('Unsupported thumbnail format')
              const record = await thumbnailCache.write(
                slot,
                revision,
                width,
                height,
                mimeType,
                await readBinary(request),
                { pageHeight, tileCount, tileIndex, tileTop },
              )
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify(record))
            } catch (error) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid thumbnail' }))
            }
            return
          }

          if (pathname === routesPath && request.method === 'POST') {
            try {
              const next = await readRoutes(request)
              if (next.routeMode !== routeMode || JSON.stringify(next.routes) !== JSON.stringify(routes)) {
                routeMode = next.routeMode
                routes = next.routes
                pageTestIndex?.setRoutes(routes)
                rebuildGraph()
              }
              response.statusCode = 204
              response.end()
            } catch (error) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }))
            }
            return
          }

          if (pathname === pagePath && request.method === 'POST') {
            try {
              const page = await readPage(request)
              const currentPage = reportedPages.get(page.path)
              const nextPage = {
                path: page.path,
                title: page.title ?? currentPage?.title,
                links: page.links ?? currentPage?.links ?? [],
              }
              if (JSON.stringify(currentPage) !== JSON.stringify(nextPage)) {
                reportedPages.set(page.path, nextPage)
                rebuildGraph(page.path)
              }
              response.statusCode = 204
              response.end()
            } catch (error) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }))
            }
            return
          }

          if (pathname !== resolved.previewPath && pathname !== `${resolved.previewPath}index.html`)
            return next()

          response.statusCode = 200
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          response.end(pageflowHtml(server.config.base, clientStyleFile ? stylePath : undefined, clientVersionPath, await getClientVersion()))
        })

        server.httpServer?.once('listening', () => {
          const address = server.httpServer?.address()
          const port = typeof address === 'object' && address ? address.port : server.config.server.port
          const configuredHost = server.config.server.host
          const host = typeof configuredHost === 'string' && configuredHost !== '0.0.0.0'
            ? configuredHost
            : 'localhost'
          const protocol = server.config.server.https ? 'https' : 'http'
          server.config.logger.info(`  unplugin-pageflow  ${protocol}://${host}:${port}${resolved.previewPath}`)
        })
        server.httpServer?.once('close', () => {
          eventResponses.forEach(response => response.end())
          eventResponses.clear()
        })
      },
    },
  }
}

export type { PageFlowOptions } from '../shared/types.ts'
export default createUnplugin(factory)
