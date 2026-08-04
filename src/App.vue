<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import UAccordion from '@nuxt/ui/components/Accordion.vue'
import UAvatar from '@nuxt/ui/components/Avatar.vue'
import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'
import UCollapsible from '@nuxt/ui/components/Collapsible.vue'
import UDropdownMenu from '@nuxt/ui/components/DropdownMenu.vue'
import UHeader from '@nuxt/ui/components/Header.vue'
import UInputMenu from '@nuxt/ui/components/InputMenu.vue'
import UTabs from '@nuxt/ui/components/Tabs.vue'
import { Leafer, Text, Group, MoveEvent, Path, Rect, ZoomEvent } from 'leafer-ui'
import '@leafer-in/view'
import '@leafer-in/viewport'
import type {
  PageFlowLink,
  PageFlowDiagnostic,
  PageFlowDiagnosticSeverity,
  PageFlowLighthouseReport,
  PageFlowLighthouseSession,
  PageFlowPage,
  PageFlowPageTest,
  PageFlowApiResult,
  PageFlowRouteMode,
  PageFlowThumbnailManifest,
  PageFlowThumbnailRecord,
  ResolvedPageFlowOptions,
} from './shared/types'
import { cancelPageFlowTest, fetchPageFlowEditor, fetchPageFlowGraph, fetchPageFlowTests, openPageFlowEditor, publishPageFlowAIContext, reportPageTitle, runPageFlowLighthouse, runPageFlowTest, startRouteDiscovery, subscribeToPageFlowUpdates, type PageFlowEditorInfo } from './client/graph'
import { planGraphUpdate } from './client/graph-update'
import { resolvePreviewUrl, touchPreviewCache } from './client/preview'
import { PAGEFLOW_SCAN_MESSAGE } from './shared/protocol'
import { forwardWheelToCanvas, PAGEFLOW_CANVAS_CONFIG, type PageFlowWheelInteraction } from './client/canvas'
import { CaptureQueue } from './client/capture-queue'
import { planNextCapture } from './client/capture-planner'
import { waitForPreviewReady } from './client/snapshot'
import { capturePageThumbnails } from './client/snapshot-capture'
import { ThumbnailResourceCache } from './client/thumbnail-resources'
import { FocusedPageStateCache } from './client/focus-cache'
import { createFocusScene, resolveFocusTargetPageIds } from './client/focus-layout'
import { createPageCardGroup, createPageDeckGroup, setPageCardShadow } from './client/scene-cards'
import { SceneNodeCache } from './client/scene-node-cache'
import { FrameAnimation } from './client/frame-animation'
import { PreviewFrameRegistry } from './client/preview-frame-registry'
import { decodePreviewMessage } from './client/preview-message'
import { createPageFlowAIContext, createPageFlowAIPrompt } from './client/ai-context'
import { createPageChecks, type PageFlowPageCheckStatus } from './client/page-checks'
import { buildApiFieldTree } from './client/api-field-tree'
import { createApiIssues, mergeApiResult, type PageFlowApiIssue } from './client/api-diagnostics'
import { cachedPreviewUsers, configuredUsers, isPreviewUserStorageKey, loadUserSessions, saveUserSessions, visibleSessionUsers } from './client/user-sessions'
import LayoutWorker from './client/layout.worker?worker&inline'
import { focusTargetSetKey, planPageUpdate } from './client/page-update'
import { pageUpdateEffectTarget } from './client/page-update-effect'
import { centerDiagnosticTransform, navigationDiagnosticBounds, planDiagnosticEvidence } from './client/diagnostic-evidence'
import { runWithConcurrency } from './client/test-concurrency'
import { isLocalBusinessApiResponse } from './runtime/api-filter'
import { addPageFlowTodo, parsePageFlowTodos, removePageFlowTodo, togglePageFlowTodo, type PageFlowTodo } from '../packages/pageflow-core/src/todos'
import { PAGEFLOW_TODOS_STORAGE_KEY } from '../packages/pageflow-core/src/storage'
import { loadPageFlowTodos, savePageFlowCanvas, savePageFlowTodos } from '../packages/pageflow-core/src/host-storage'
import type { PageFlowHost, PageFlowHostState } from '../packages/pageflow-core/src/host'
import { initialPreviewMode } from './client/preview-mode'
import { UnpluginPageFlowHost } from './client/unplugin-host'
import { hostHotspotRects, hostStateToGraph } from './client/host-workbench'
import { parseStoredHostThumbnails, storedHostThumbnailRecords, upsertStoredHostThumbnail, type StoredHostThumbnail } from './client/host-thumbnails'
import { startPageFlowHostSession } from './client/host-session'
import { detectScaledPreviewSize, parsePreviewSize } from './client/preview-size'
import {
  fetchThumbnailManifest,
  fullThumbnailTiles,
  thumbnailRevision,
  thumbnailPageKey,
  thumbnailSlot,
  thumbnailTierForZoom,
  thumbnailUrl,
  visibleThumbnailTilesOrCompact,
  type PageFlowPreviewMode,
  type PageFlowThumbnailTier,
} from './client/thumbnails'
import {
  centerPageTransform,
  fitFocusedPreviewTransform,
  createPageSpatialIndex,
  createRouteDeckView,
  getRenderablePages,
  getVisiblePageIds,
  layoutPageGrid,
  responsivePageGridColumns,
  promotedRouteGroupPath,
  routeDeckPathForPage,
  PAGE_CARD_META_HEIGHT,
  PAGE_CARD_WIDTH,
  PAGEFLOW_AUTO_PREVIEW_SCALE,
  PAGE_PREVIEW_INSET,
  type CanvasTransform,
} from './client/layout'

const props = defineProps<{ config: ResolvedPageFlowOptions, host?: PageFlowHost }>()
const ACCENTS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
const MAX_HOST_AUTO_THUMBNAILS = 50
const ApiFieldTree = defineAsyncComponent(() => import('./components/ApiFieldTree.vue'))

const previewModes = {
  mobile: { label: '手机', width: 393, height: 852 },
  tablet: { label: '平板', width: 768, height: 1024 },
} as const
const PC_PREVIEW_SIZE_STORAGE_KEY = 'unplugin-pageflow:pc-preview-size'
function storedPcPreviewSize() {
  try {
    return parsePreviewSize(localStorage.getItem(PC_PREVIEW_SIZE_STORAGE_KEY))
  } catch {
    return
  }
}
const initialPcPreviewSize = storedPcPreviewSize()
const pcPreviewSize = ref(initialPcPreviewSize ?? { width: window.innerWidth, height: window.innerHeight })
let pcDesignSizeDetected = Boolean(initialPcPreviewSize)
const viewportTabs: Array<Record<string, unknown>> = [
  { value: 'mobile', label: previewModes.mobile.label, icon: 'i-lucide-smartphone', ui: { label: 'sr-only' } },
  { value: 'tablet', label: previewModes.tablet.label, icon: 'i-lucide-tablet', ui: { label: 'sr-only' } },
  { value: 'pc', label: 'PC', icon: 'i-lucide-monitor', ui: { label: 'sr-only' } },
]
const PREVIEW_MODE_STORAGE_KEY = 'unplugin-pageflow:preview-mode'
const initialUserSessions = loadUserSessions()

function storedPreviewMode(): PageFlowPreviewMode {
  try {
    return initialPreviewMode(localStorage.getItem(PREVIEW_MODE_STORAGE_KEY), props.config.framework)
  } catch {
    return initialPreviewMode(null, props.config.framework)
  }
}

const demoPages: PageFlowPage[] = [
  { id: 'home', title: 'Home', path: '/', accent: '#ff795d', links: [{ label: 'Explore', to: 'explore' }, { label: 'Sign in', to: 'login' }] },
  { id: 'explore', title: 'Explore', path: '/explore', accent: '#7c6cff', links: [{ label: 'Featured card', to: 'detail' }, { label: 'Account', to: 'login' }] },
  { id: 'detail', title: 'Detail', path: '/detail/:id', accent: '#26b99a', links: [{ label: 'Buy now', to: 'checkout' }, { label: 'Back', to: 'explore' }] },
  { id: 'login', title: 'Sign in', path: '/login', accent: '#e7ad43', links: [{ label: 'Submit', to: 'home' }] },
  { id: 'checkout', title: 'Checkout', path: '/checkout', accent: '#dd648e', links: [{ label: 'Complete', to: 'home' }] },
]
const pages = ref<PageFlowPage[]>(props.config.previewPath === '/' ? demoPages : [])
const routeGroupPath = ref<string[]>([])
const active = ref('home')
const status = ref(props.config.previewPath === '/' ? 'Demo data' : 'Discovering routes…')
const groupNames = ref({ ...props.config.groupNames })
const canvasLayouts = ref({ ...props.config.canvasLayouts })
const zoomPercent = ref(90)
const visiblePageIds = ref(new Set<string>())
const viewportInteracting = ref(false)
const thumbnailManifest = ref<PageFlowThumbnailManifest>({})
const thumbnailManifestLoaded = ref(props.config.previewPath === '/')
const initialSceneReady = ref(props.config.previewPath === '/')
const initialLayoutSettled = ref(props.config.previewPath === '/')
const initialResourcesSettled = ref(props.config.previewPath === '/')
const previewMode = ref<PageFlowPreviewMode>(storedPreviewMode())
const thumbnailTier = ref<PageFlowThumbnailTier>(thumbnailTierForZoom(zoomPercent.value))
const thumbnailResources = ref<Record<string, string>>({})
const navigationLocations = ref<Record<string, string>>({})
const users = ref(visibleSessionUsers(initialUserSessions.users, props.config.previewRoles, cachedPreviewUsers()))
const userNotes = ref<Record<string, string>>(initialUserSessions.notes)
const activeUser = ref(users.value.includes(initialUserSessions.activeUser ?? '') ? initialUserSessions.activeUser : users.value[0])
const pageUsers = ref<Record<string, string>>(Object.fromEntries(
  Object.entries(initialUserSessions.pageUsers).filter(([, user]) => users.value.includes(user)),
))
const settledTransform = ref<CanvasTransform>({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
const livePreviewId = ref<string>()
const focusedPageId = ref<string>()
const focusedLinks = ref<PageFlowLink[]>([])
const apiResultsByPage = ref<Record<string, PageFlowApiResult[]>>({})
const expandedApiResults = ref(new Set<string>())
const openApiResultId = ref<string>()
const openApiIssueResultId = ref<string>()
const panelTab = ref<'api' | 'tests' | 'diagnostics' | 'todos'>('api')
const panelCollapsed = ref(false)
const editorInfo = ref<PageFlowEditorInfo>({ id: 'system', name: '默认编辑器' })
const editorOpening = ref(false)
const editorOpenError = ref('')
const pageTodos = ref<Record<string, PageFlowTodo[]>>({})
const newTodoText = ref('')
const focusedDiagnostics = ref<PageFlowDiagnostic[]>([])
const diagnosticsLoading = ref(false)
const diagnosticSeverity = ref<'all' | PageFlowDiagnosticSeverity>('all')
const lighthouseReport = ref<PageFlowLighthouseReport>()
const lighthouseLoading = ref(false)
const lighthouseError = ref('')
const focusedPageTests = ref<PageFlowPageTest[]>([])
const focusedTestsLoading = ref(false)
const focusedTestsFailed = ref(false)
const runningPageTestIds = ref(new Set<string>())
const runningAllPageTests = ref(false)
const stopAllPageTestsRequested = ref(false)
const hoveredHotspot = ref<{ targets: string[]; centerX?: number; centerY?: number }>()
const focusedTargetPositions = ref<Record<string, [number, number]>>({})
const parkedPages = ref<Record<string, PageFlowPage>>({})
const parkedPagePositions = ref<Record<string, [number, number]>>({})
const parkedPageDepth = ref<Record<string, number>>({})
const parkedPageProgress = ref<Record<string, number>>({})
const livePreviewCacheIds = ref<string[]>([])
const loadedPreviewIds = ref(new Set<string>())
const readyPreviewIds = ref(new Set<string>())
const routeMode = ref<PageFlowRouteMode>('history')
const capturePreviewId = ref<string>()
const copiedPath = ref<string>()
const darkMode = ref(document.documentElement.classList.contains('dark'))
const searchOpen = ref(false)
const searchSelection = ref<string>()
const searchRoot = ref<HTMLDivElement>()
const canvas = ref<HTMLDivElement>()
const connectionCanvas = ref<HTMLDivElement>()
const overlayWorld = ref<HTMLDivElement>()
const focusedPageChecks = computed(() => {
  const page = pages.value.find(item => item.id === focusedPageId.value)
  if (!page) return []
  const checks = createPageChecks(page, pages.value, focusedPageTests.value)
  return focusedTestsLoading.value || focusedTestsFailed.value ? checks.filter(item => item.id !== 'tests') : checks
})
const focusedTestIssueCount = computed(() => focusedPageChecks.value.filter(item => item.status !== 'passed').length
  + focusedPageTests.value.filter(test => test.status === 'failed').length)
const focusedTodos = computed(() => focusedPageId.value ? pageTodos.value[focusedPageId.value] ?? [] : [])
const focusedOpenTodoCount = computed(() => focusedTodos.value.filter(todo => !todo.done).length)

const panelTabs = computed(() => [
  { value: 'api', label: '接口', badge: focusedApiResults.value.length, slot: 'api' },
  { value: 'tests', label: '测试', badge: focusedTestIssueCount.value, slot: 'tests' },
  { value: 'diagnostics', label: '诊断', badge: focusedDiagnostics.value.filter(item => item.severity === 'error').length, slot: 'diagnostics' },
  { value: 'todos', label: '待办', badge: focusedOpenTodoCount.value, slot: 'todos' },
])
const editorIcon = computed(() => ({
  cursor: 'i-lucide-square-mouse-pointer',
  jetbrains: 'i-lucide-box',
  sublime: 'i-lucide-file-code-2',
  system: 'i-lucide-file-code-2',
  vscode: 'i-lucide-code-2',
  zed: 'i-lucide-zap',
}[editorInfo.value.id]))
const focusedEditorPage = computed(() => pages.value.find(item => item.id === focusedPageId.value))
const editorButtonHint = computed(() => editorOpenError.value
  || (focusedEditorPage.value?.sourceFile
    ? `在${editorInfo.value.name}中打开\n${focusedEditorPage.value.sourceFile}`
  : `无法在${editorInfo.value.name}中打开：未解析到当前页面的源文件`)
)

async function openFocusedPageInEditor() {
  const page = focusedEditorPage.value
  if (!page?.sourceFile || editorOpening.value) return
  editorOpening.value = true
  editorOpenError.value = ''
  try {
    await openPageFlowEditor(props.config, page.path)
    status.value = `已在${editorInfo.value.name}中打开`
  } catch (error) {
    editorOpenError.value = error instanceof Error ? error.message : '无法打开页面源文件'
    status.value = editorOpenError.value
  } finally {
    editorOpening.value = false
  }
}
const headerUserMenuItems = computed(() => [
  [{ type: 'label' as const, label: '切换用户' }],
  users.value.map(user => ({
    label: user,
    description: userNotes.value[user],
    user,
    onSelect: () => selectActiveUser(user),
  })),
])

function menuItemUser(item: unknown) {
  return item && typeof item === 'object' && 'user' in item && typeof item.user === 'string' ? item.user : undefined
}

function pageUserMenuItems(pageId: string) {
  return users.value.map(user => ({
    label: userNotes.value[user] || user,
    onSelect: () => selectPageUser(pageId, user),
  }))
}

function savePageTodos() {
  void savePageFlowTodos(pageFlowHost, pageTodos.value)
}

function addPageTodo() {
  const pageId = focusedPageId.value
  const text = newTodoText.value.trim()
  if (!pageId || !text) return
  pageTodos.value = addPageFlowTodo(pageTodos.value, pageId, text)
  newTodoText.value = ''
  savePageTodos()
}

function togglePageTodo(id: string) {
  const pageId = focusedPageId.value
  if (!pageId) return
  pageTodos.value = togglePageFlowTodo(pageTodos.value, pageId, id)
  savePageTodos()
}

function removePageTodo(id: string) {
  const pageId = focusedPageId.value
  if (!pageId) return
  pageTodos.value = removePageFlowTodo(pageTodos.value, pageId, id)
  savePageTodos()
}
let leafer: Leafer | undefined
let connectionLeafer: Leafer | undefined
let edgeLayer: Group | undefined
let connectionLayer: Group | undefined
let connectionPathLayer: Group | undefined
let hotspotLayer: Group | undefined
let cardLayer: Group | undefined
let cardNodes: SceneNodeCache<Group> | undefined
let connectionNodes: SceneNodeCache<Path> | undefined
let hotspotNodes: SceneNodeCache<Rect> | undefined
let viewportFrame = 0
let focusLayoutProgress = 0
let viewportIdleTimer: ReturnType<typeof setTimeout> | undefined
let backgroundCaptureNotBefore = 0
const PRIORITY_CAPTURE_DELAY = 300
const OFFSCREEN_CAPTURE_DELAY = 2500
const BACKGROUND_CAPTURE_INTERACTION_DELAY = 3000
const PREVIEW_READY_QUIET_MS = 2500
let copiedPathTimer: ReturnType<typeof setTimeout> | undefined
let routeDiscoveryFrame: HTMLIFrameElement | undefined
let layoutWorker: Worker | undefined
let stopPageFlowUpdates: (() => void) | undefined
let layoutRequestId = 0
let animateLayoutRequest = false
let layoutTimeout: ReturnType<typeof setTimeout> | undefined
let initialRevealTimer: ReturnType<typeof setTimeout> | undefined
const failedPreviewIds = new Set<string>()
const forcedThumbnailRefreshIds = new Set<string>()
const manualCaptureIds = new Set<string>()
const previewFrames = new PreviewFrameRegistry()
const captureFrameElement = ref<HTMLIFrameElement>()
const pageUpdateEffects = new Map<string, { group: Group, animation: FrameAnimation }>()
const capturesInProgress = new Set<string>()
const captureRetryCounts = new Map<string, number>()
const captureRetryTimers = new Map<string, number>()
const focusedPageStateCache = new FocusedPageStateCache()
const diagnosticsByPage = new Map<string, { revision: string, diagnostics: PageFlowDiagnostic[] }>()
let focusedLinksScannedPageId: string | undefined
let diagnosticsTimer: number | undefined
let diagnosticsRequestTimer: number | undefined
let aiContextTimer: number | undefined
let diagnosticsInFlightPageId: string | undefined
let diagnosticsRefreshQueued = false
const pendingThumbnailRecords: PageFlowThumbnailManifest = {}
let captureBatchIds = new Set<string>()
let focusExitPending = false
let focusTransitionTargetId: string | undefined
let routeTransitionTargetId: string | undefined
let focusTargetDraggedAt = 0
let suppressCanvasClickUntil = 0
let focusTargetDrag: {
  pointerId: number
  pageId: string
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  moved: boolean
} | undefined
let canvasPageDrag: typeof focusTargetDrag
let previewGeneration = 0
const MAX_MOUNTED_PREVIEWS = 96
const MAX_DECK_LAYERS = 5
const PARKED_PAGE_GAP = 180
const SELECTED_PAGE_SCALE = 1.03
const thumbnailResourceCache = new ThumbnailResourceCache(160)
const captureQueue = new CaptureQueue({
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: timer => clearTimeout(timer),
  requestIdleCallback: window.requestIdleCallback?.bind(window),
  cancelIdleCallback: window.cancelIdleCallback?.bind(window),
})
const animationHost = {
  now: () => performance.now(),
  requestAnimationFrame: (callback: FrameRequestCallback) => requestAnimationFrame(callback),
  cancelAnimationFrame: (id: number) => cancelAnimationFrame(id),
}
const focusAnimation = new FrameAnimation(animationHost)
const hoverAnimation = new FrameAnimation(animationHost)
const flightAnimation = new FrameAnimation(animationHost)
let thumbnailResourceGeneration = 0
let focusedTestsRequest = 0
let sceneRenderFrame = 0
let capturePulseFrame = 0
let capturePulseGroup: Group | undefined
let capturePulseHighlighted = false
let hoverFadeProgress = 0
let pcViewportResizeTimer = 0
let canvasViewport = { width: 0, height: 0 }
let hostThumbnailQueueRunning = false
let hostCanvasOrigin = ''
let hostCanvasStorage: Record<string, unknown> = {}
let storedHostThumbnails: StoredHostThumbnail[] = []
const hostPageUrls = new Map<string, string>()
const failedHostThumbnailIds = new Set<string>()
const currentPreviewMode = computed(() => previewMode.value === 'pc'
  ? { label: 'PC', ...pcPreviewSize.value }
  : previewModes[previewMode.value])
const maximumMountedPreviews = computed(() => {
  if (zoomPercent.value < 5) return 0
  if (thumbnailTier.value === 'compact') return pages.value.length
  return MAX_MOUNTED_PREVIEWS
})
const cardHeights = computed(() => new Map(pages.value.map(page => [page.id, pageCardHeight(page.id)])))
const routeDeckView = computed(() => createRouteDeckView(pages.value, routeGroupPath.value))
const canvasPages = computed(() => [...routeDeckView.value.directPages, ...routeDeckView.value.decks.map(deck => deck.representative)])
const routeDeckByPageId = computed(() => new Map(routeDeckView.value.decks.map(deck => [deck.representative.id, deck])))
function deckLayerPages(pageId: string) {
  const deck = routeDeckByPageId.value.get(pageId)
  if (!deck) return []
  const childView = createRouteDeckView(deck.pages, [...routeGroupPath.value, deck.label])
  return [...childView.directPages, ...childView.decks.map(childDeck => childDeck.representative)]
}
function visibleDeckLayerPages(pageId: string) {
  return deckLayerPages(pageId).slice(0, MAX_DECK_LAYERS)
}
const initialGridPositions = layoutPageGrid(
  canvasPages.value,
  cardHeights.value,
  responsivePageGridColumns({ width: window.innerWidth, height: window.innerHeight }, canvasPages.value, cardHeights.value),
)
const positions = ref(restoreCanvasLayout(initialGridPositions, canvasPages.value))
const spatialIndex = computed(() => createPageSpatialIndex(canvasPages.value, positions.value, cardHeights.value))
const focusedTargetPageIds = computed(() => {
  return resolveFocusTargetPageIds(pages.value, focusedLinks.value, focusedPageId.value)
})
const renderedPages = computed(() => getRenderablePages(
  pages.value,
  visiblePageIds.value,
  [...livePreviewCacheIds.value, capturePreviewId.value, focusedPageId.value, ...focusedTargetPageIds.value],
  maximumMountedPreviews.value,
))
const captureOnlyPage = computed(() => pages.value.find(page => page.id === capturePreviewId.value
  && page.id !== focusedPageId.value
  && !livePreviewCacheIds.value.includes(page.id)))
const previewPages = computed(() => renderedPages.value.filter(page => shouldRenderPreview(page.id) && page.id !== captureOnlyPage.value?.id))
const requiredThumbnailRecords = computed(() => {
  const records = renderedPages.value.flatMap(page => {
  const records = pageThumbnailTiles(page)
  const compact = compactThumbnailRecord(page.id)
  if (thumbnailTier.value === 'compact') return compact ? [compact] : records
  return compact && !records.some(record => record.slot === compact.slot)
    ? [compact, ...records]
    : records
  })
  routeDeckView.value.decks
    .filter(deck => visiblePageIds.value.has(deck.representative.id))
    .forEach(deck => visibleDeckLayerPages(deck.representative.id).forEach(page => {
      const compact = compactThumbnailRecord(page.id)
      if (compact) records.push(compact)
    }))
  Object.values(parkedPages.value).forEach(page => {
    const pageRecords = pageThumbnailTiles(page)
    const compact = compactThumbnailRecord(page.id)
    if (thumbnailTier.value === 'compact') {
      if (compact) records.push(compact)
      else records.push(...pageRecords)
    } else {
      if (compact && !pageRecords.some(record => record.slot === compact.slot)) records.push(compact)
      records.push(...pageRecords)
    }
  })
  if (focusedPageId.value && focusedDiagnostics.value.some(item => item.bounds))
    records.push(...fullThumbnailRecords(focusedPageId.value))
  return [...new Map(records.map(record => [record.slot, record])).values()]
})
const focusScene = computed(() => createFocusScene({
  pages: pages.value,
  focusedPageId: focusedPageId.value,
  links: focusedLinks.value,
  positions: positions.value,
  targetPositions: focusedTargetPositions.value,
  pagePreviewHeight,
  pageCardHeight,
  selectedPageScale: SELECTED_PAGE_SCALE,
}))
const connectionPaths = computed(() => focusScene.value?.connections ?? [])
const focusedApiResults = computed(() => focusedPageId.value
  ? (apiResultsByPage.value[focusedPageId.value] ?? []).filter(result => isLocalBusinessApiResponse(result.url, window.location.origin, result.contentType))
  : [])
const pageFlowHost: PageFlowHost = props.host ?? new UnpluginPageFlowHost({
  config: props.config,
  getFrame: () => focusedPageId.value ? previewFrames.get(focusedPageId.value) : undefined,
  getRequests: () => focusedApiResults.value,
  capture: captureFocusedPageForHost,
})
const focusedApiIssues = computed(() => createApiIssues(focusedApiResults.value, props.config.apiDiagnostics))
interface FocusedDiagnosticGroup {
  value: string
  label: string
  severity: PageFlowDiagnosticSeverity
  source?: PageFlowDiagnostic['source']
  description: string
  items: PageFlowDiagnostic[]
}

const focusedDiagnosticGroups = computed(() => {
  const severityOrder: Record<PageFlowDiagnosticSeverity, number> = { error: 0, warning: 1, suggestion: 2 }
  const groups = new Map<string, FocusedDiagnosticGroup>()
  for (const item of focusedDiagnostics.value) {
    const value = `${item.source ?? 'pageflow'}:${item.ruleId}:${item.severity}`
    const group = groups.get(value)
    if (group) group.items.push(item)
    else groups.set(value, {
      value,
      label: item.title,
      severity: item.severity,
      source: item.source,
      description: item.description,
      items: [item],
    })
  }
  return [...groups.values()].sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity])
})
const filteredFocusedDiagnosticGroups = computed(() => diagnosticSeverity.value === 'all'
  ? focusedDiagnosticGroups.value
  : focusedDiagnosticGroups.value.filter(group => group.severity === diagnosticSeverity.value))
const diagnosticSummary = computed(() => focusedDiagnostics.value.reduce((summary, item) => {
  summary[item.severity]++
  return summary
}, { error: 0, warning: 0, suggestion: 0 }))
const diagnosticSeverityOptions: Array<{ value: 'all' | PageFlowDiagnosticSeverity, label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'error', label: '错误' },
  { value: 'warning', label: '警告' },
  { value: 'suggestion', label: '建议' },
]
const diagnosticSeverityLabels: Record<PageFlowDiagnosticSeverity, string> = {
  error: '错误',
  warning: '警告',
  suggestion: '建议',
}

const focusedDiagnosticEvidence = computed(() => {
  const pageId = focusedPageId.value
  if (!pageId) return new Map()
  const records = fullThumbnailRecords(pageId).flatMap((record) => {
    const source = thumbnailSource(record)
    return source ? [{ source, sourceWidth: record.width, height: record.height, tileTop: record.tileTop }] : []
  })
  return new Map(focusedDiagnostics.value.flatMap((item) => {
    const bounds = item.bounds ?? navigationDiagnosticBounds(item, focusedLinks.value, currentPreviewMode.value)
    if (!bounds) return []
    const evidence = planDiagnosticEvidence(bounds, records, currentPreviewMode.value.width)
    return evidence ? [[item.id, evidence] as const] : []
  }))
})

function diagnosticColor(severity: PageFlowDiagnosticSeverity) {
  return severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info'
}

const lighthouseCategoryLabels: Record<keyof PageFlowLighthouseReport['scores'], string> = {
  performance: '性能',
  accessibility: '无障碍',
  'best-practices': '最佳实践',
  seo: 'SEO',
}

function lighthouseScoreColor(score: number | null) {
  if (score == null) return 'neutral'
  if (score >= 90) return 'success'
  if (score >= 50) return 'warning'
  return 'error'
}

async function runFocusedLighthouse() {
  const page = pages.value.find(item => item.id === focusedPageId.value)
  if (!page || lighthouseLoading.value) return
  lighthouseLoading.value = true
  cancelScheduledCapture()
  lighthouseError.value = ''
  try {
    const frame = previewFrames.get(page.id)
    let path = page.path
    let session: PageFlowLighthouseSession | undefined
    if (frame?.contentWindow) {
      const location = new URL(frame.contentWindow.location.href)
      location.searchParams.delete('__unplugin-pageflow_preview')
      path = `${location.pathname}${location.search}${location.hash}`
      const readStorage = (browserStorage: Storage) => Object.fromEntries(Array.from({ length: browserStorage.length }, (_, index) => {
        const key = browserStorage.key(index)
        return key == null ? undefined : [key, browserStorage.getItem(key) ?? ''] as const
      }).filter(entry => entry != null))
      session = {
        localStorage: readStorage(frame.contentWindow.localStorage),
        sessionStorage: readStorage(frame.contentWindow.sessionStorage),
      }
      if (JSON.stringify(session).length > 262_144) throw new Error('当前页面会话数据过大，无法安全传给 Lighthouse')
    }
    lighthouseReport.value = await runPageFlowLighthouse(props.config, path, session)
  } catch (error) {
    lighthouseError.value = error instanceof Error ? error.message : 'Lighthouse 审计失败'
  } finally {
    lighthouseLoading.value = false
    backgroundCaptureNotBefore = Date.now() + BACKGROUND_CAPTURE_INTERACTION_DELAY
    scheduleNextCapture()
  }
}

async function exportFocusedDiagnostics() {
  const page = pages.value.find(item => item.id === focusedPageId.value)
  if (!page) return
  const { createDiagnosticReport, diagnosticReportFilename } = await import('./client/diagnostic-report')
  const report = createDiagnosticReport(page, focusedDiagnostics.value, lighthouseReport.value)
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = diagnosticReportFilename(page.path)
  link.click()
  URL.revokeObjectURL(url)
}

function focusedAIContext() {
  const page = pages.value.find(item => item.id === focusedPageId.value)
  if (!page) return
  return createPageFlowAIContext(page, {
    diagnostics: focusedDiagnostics.value,
    requests: focusedApiResults.value,
    tests: focusedPageTests.value,
    links: focusedLinks.value,
    lighthouse: lighthouseReport.value,
  })
}

async function copyFocusedAIRepairPrompt() {
  const context = focusedAIContext()
  if (!context) return
  await navigator.clipboard.writeText(createPageFlowAIPrompt(context))
  status.value = '已复制 AI 修复提示词'
}

function scheduleAIContextSync() {
  window.clearTimeout(aiContextTimer)
  if (props.host) return
  aiContextTimer = window.setTimeout(() => {
    const context = focusedAIContext()
    if (context) void publishPageFlowAIContext(props.config, context).catch(() => undefined)
  }, 250)
}

const testKindLabels: Record<PageFlowPageTest['kind'], string> = { e2e: 'E2E', component: '组件', unit: '单元' }
const testStatusLabels: Record<PageFlowPageTest['status'], string> = { unknown: '未运行', passed: '通过', failed: '失败', skipped: '跳过' }
const pageCheckStatusLabels: Record<PageFlowPageCheckStatus, string> = { passed: '通过', failed: '失败', uncovered: '未覆盖' }
const runnableFocusedTests = computed(() => focusedPageTests.value.filter(test => test.runnable))

function pageCheckColor(status: PageFlowPageCheckStatus) {
  return status === 'passed' ? 'success' : status === 'failed' ? 'error' : 'warning'
}

function locateFocusedPage() {
  const pageId = focusedPageId.value
  const position = pageId ? positions.value.get(pageId) : undefined
  if (!pageId || !position || !leafer || !canvas.value) return
  flyToPage(pageId, position, undefined, undefined, fitFocusedPreviewTransform(
    position,
    pagePreviewHeight(pageId),
    { width: canvas.value.clientWidth, height: canvas.value.clientHeight },
    SELECTED_PAGE_SCALE,
    32,
    16,
    currentPreviewMode.value.width,
  ))
}

function testStatusLabel(test: PageFlowPageTest) {
  if (test.duration == null) return testStatusLabels[test.status]
  const duration = test.duration >= 1000
    ? `${Number((test.duration / 1000).toFixed(1))}s`
    : `${test.duration}ms`
  return `${testStatusLabels[test.status]} · ${duration}`
}

const ansiControlPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g')

function cleanTestOutput(output: string) {
  return output.replace(ansiControlPattern, '')
}
const focusedTestSummary = computed(() => focusedPageTests.value.reduce((summary, test) => {
  summary[test.status]++
  return summary
}, { unknown: 0, passed: 0, failed: 0, skipped: 0 }))

async function refreshFocusedTests() {
  const request = ++focusedTestsRequest
  const page = pages.value.find(item => item.id === focusedPageId.value)
  if (!page || props.host) {
    focusedPageTests.value = []
    focusedTestsLoading.value = false
    return
  }
  focusedTestsLoading.value = true
  focusedTestsFailed.value = false
  try {
    const tests = await fetchPageFlowTests(props.config, page.path)
    if (request === focusedTestsRequest && page.id === focusedPageId.value) focusedPageTests.value = tests
  } catch {
    if (request === focusedTestsRequest) focusedTestsFailed.value = true
  } finally {
    if (request === focusedTestsRequest) focusedTestsLoading.value = false
  }
}

async function runFocusedPageTest(test: PageFlowPageTest) {
  const page = pages.value.find(item => item.id === focusedPageId.value)
  if (!page || runningPageTestIds.value.has(test.id)) return
  runningPageTestIds.value = new Set(runningPageTestIds.value).add(test.id)
  cancelScheduledCapture()
  try {
    const result = await runPageFlowTest(props.config, page.path, test.id)
    if (focusedPageId.value === page.id)
      focusedPageTests.value = focusedPageTests.value.map(item => item.id === test.id ? { ...item, ...result } : item)
  } catch (error) {
    if (focusedPageId.value === page.id)
      focusedPageTests.value = focusedPageTests.value.map(item => item.id === test.id
        ? { ...item, status: 'failed', output: error instanceof Error ? error.message : '测试执行失败' }
        : item)
  } finally {
    const next = new Set(runningPageTestIds.value)
    next.delete(test.id)
    runningPageTestIds.value = next
    if (!next.size) {
      backgroundCaptureNotBefore = Date.now() + BACKGROUND_CAPTURE_INTERACTION_DELAY
      scheduleNextCapture()
    }
  }
}

async function runAllFocusedPageTests() {
  if (runningAllPageTests.value || !runnableFocusedTests.value.length) return
  const pageId = focusedPageId.value
  runningAllPageTests.value = true
  stopAllPageTestsRequested.value = false
  try {
    await runWithConcurrency([...runnableFocusedTests.value], 3, runFocusedPageTest,
      () => focusedPageId.value !== pageId || stopAllPageTestsRequested.value)
  } finally {
    runningAllPageTests.value = false
    stopAllPageTestsRequested.value = false
  }
}

async function cancelFocusedPageTest(test: PageFlowPageTest) {
  if (!runningPageTestIds.value.has(test.id)) return
  await cancelPageFlowTest(props.config, test.id).catch(() => undefined)
}

async function stopAllFocusedPageTests() {
  stopAllPageTestsRequested.value = true
  await Promise.all([...runningPageTestIds.value].map(id => cancelPageFlowTest(props.config, id).catch(() => undefined)))
}

function toggleApiResult(id: string) {
  const next = new Set(expandedApiResults.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedApiResults.value = next
}

function visibleApiFields(result: PageFlowApiResult) {
  return expandedApiResults.value.has(result.id) ? result.fields : result.fields.filter(field => field.used)
}

function apiResultById(id: string) {
  return focusedApiResults.value.find(result => result.id === id)
}

function apiFieldTreeByResultId(id: string) {
  const result = apiResultById(id)
  return result ? visibleApiFieldTree(result) : []
}

function unusedApiFieldCount(id: string) {
  return apiResultById(id)?.fields.filter(field => !field.used).length ?? 0
}

function toggleApiIssueResult(id: string) {
  openApiIssueResultId.value = openApiIssueResultId.value === id ? undefined : id
}

function apiRoute(url: string) {
  let pathname = url.split(/[?#]/, 1)[0]
  try {
    pathname = new URL(url, 'http://pageflow.local').pathname
  } catch {
    // Keep the path extracted from malformed or non-standard request URLs.
  }
  return pathname.replace(/^\/(?:api|(?:prod|dev|test|stage)-api)(?=\/|$)/, '') || '/'
}

const apiAccordionItems = computed(() => focusedApiResults.value.map(result => ({
  ...result,
  value: result.id,
  label: apiRoute(result.url),
})))

const apiMethodColors = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  PATCH: 'secondary',
  DELETE: 'error',
} as const

function apiMethodColor(method: string) {
  return apiMethodColors[method.toUpperCase() as keyof typeof apiMethodColors] ?? 'neutral'
}

function apiIssueColor(status: PageFlowApiIssue['status']) {
  return status === 'failed' ? 'error' : 'warning'
}

function apiIssueLabel(issue: PageFlowApiIssue) {
  const result = focusedApiResults.value.find(item => item.id === issue.resultId)
  return result ? `${result.method.toUpperCase()} ${apiRoute(result.url)}` : issue.title
}

function visibleApiFieldTree(result: PageFlowApiResult) {
  return buildApiFieldTree(visibleApiFields(result))
}
const connectionCountsByTarget = computed(() => connectionPaths.value.reduce((counts, connection) => {
  counts.set(connection.targetId, (counts.get(connection.targetId) ?? 0) + 1)
  return counts
}, new Map<string, number>()))
const hoveredTargetPageIds = computed(() => {
  const hover = hoveredHotspot.value
  if (!hover) return new Set<string>()
  const idsByPath = new Map(pages.value.map(page => [page.path, page.id]))
  return new Set(hover.targets.flatMap(target => pages.value.some(page => page.id === target) ? [target] : idsByPath.get(target) ? [idsByPath.get(target)!] : []))
})

function setHoveredHotspot(
  next: { targets: string[]; centerX?: number; centerY?: number } | undefined,
  animate = true,
) {
  const wasActive = Boolean(hoveredHotspot.value)
  const nextActive = Boolean(next)
  hoveredHotspot.value = next
  if (!animate) {
    hoverAnimation.cancel()
    hoverFadeProgress = nextActive ? 1 : 0
    scheduleCanvasRender()
    return
  }
  if (wasActive === nextActive) {
    scheduleCanvasRender()
    return
  }
  const from = hoverFadeProgress
  const to = nextActive ? 1 : 0
  hoverAnimation.start(500, progress => {
    hoverFadeProgress = from + (to - from) * (1 - (1 - progress) ** 3)
    renderCanvasScene()
  })
}

function compactThumbnailRecord(pageId: string) {
  const page = pages.value.find(page => page.id === pageId)
  return thumbnailManifest.value[thumbnailSlot(page ? thumbnailPageKey(page, pages.value) : pageId, previewMode.value, 'compact')]
}

function fullThumbnailRecords(pageId: string) {
  const page = pages.value.find(page => page.id === pageId)
  return fullThumbnailTiles(thumbnailManifest.value, page ? thumbnailPageKey(page, pages.value) : pageId, previewMode.value)
}

function thumbnailIsCurrent(page: PageFlowPage) {
  if (forcedThumbnailRefreshIds.has(page.id)) return false
  const revision = pageThumbnailRevision(page)
  const compact = compactThumbnailRecord(page.id)
  const full = fullThumbnailRecords(page.id)
  return compact?.revision === revision
    && Boolean(full.length)
    && full.every(record => record.revision === revision)
}

function pageThumbnailTiles(page: PageFlowPage) {
  const compact = compactThumbnailRecord(page.id)
  if (thumbnailTier.value === 'compact') return compact ? [compact] : []
  const full = fullThumbnailRecords(page.id)
  if (!full.length) return compact ? [compact] : []
  const focusedTarget = focusScene.value?.targets.find(target => target.page.id === page.id)
  const pageWorldY = focusedTarget?.y
    ?? (focusScene.value?.source.id === page.id ? focusScene.value.sourcePosition[1] : pagePosition(page.id)[1])
  return visibleThumbnailTilesOrCompact(
    full,
    compact,
    pageWorldY,
    { width: canvas.value?.clientWidth ?? 0, height: canvas.value?.clientHeight ?? 0 },
    settledTransform.value,
  )
}

function thumbnailSource(record: PageFlowThumbnailRecord) {
  return thumbnailResources.value[thumbnailUrl(props.config, record)]
}

async function captureHostThumbnail(page: PageFlowPage, capturedSource?: string) {
  if (!props.host) return
  const viewport = { width: currentPreviewMode.value.width, height: currentPreviewMode.value.height }
  const pageUrl = hostPageUrls.get(page.id)
  const captured = capturedSource
    ?? (props.host.capturePage && pageUrl ? await props.host.capturePage(pageUrl, viewport) : await props.host.capture())
  const { encodeHostThumbnail, persistHostThumbnails } = await import('./client/host-thumbnail-capture')
  const encoded = await encodeHostThumbnail(captured, PAGE_CARD_WIDTH)
  const revision = pageThumbnailRevision(page)
  const { source, height: thumbnailHeight } = encoded
  const records = (['compact', 'full'] as const).map(tier => ({
    slot: thumbnailSlot(thumbnailPageKey(page, pages.value), previewMode.value, tier),
    revision,
    width: PAGE_CARD_WIDTH,
    height: thumbnailHeight,
    pageHeight: thumbnailHeight,
    mimeType: 'image/webp',
    file: '',
    updatedAt: Date.now(),
  }))
  thumbnailManifest.value = {
    ...thumbnailManifest.value,
    ...Object.fromEntries(records.map(record => [record.slot, record])),
  }
  records.forEach(record => thumbnailResourceCache.set(thumbnailUrl(props.config, record), source))
  thumbnailResources.value = {
    ...thumbnailResources.value,
    ...Object.fromEntries(records.map(record => [thumbnailUrl(props.config, record), source])),
  }
  forcedThumbnailRefreshIds.delete(page.id)
  manualCaptureIds.delete(page.id)
  failedHostThumbnailIds.delete(page.id)
  draw()
  const stored: StoredHostThumbnail = {
    pageId: thumbnailPageKey(page, pages.value),
    mode: previewMode.value,
    revision,
    source,
    width: PAGE_CARD_WIDTH,
    height: thumbnailHeight,
    updatedAt: records[0].updatedAt,
  }
  storedHostThumbnails = upsertStoredHostThumbnail(storedHostThumbnails, stored)
  if (hostCanvasOrigin && props.host) {
    try {
      hostCanvasStorage = await persistHostThumbnails(props.host, hostCanvasOrigin, hostCanvasStorage, storedHostThumbnails)
    } catch (error) {
      console.warn('PageFlow failed to persist host thumbnail', error)
    }
  }
}

function restoreHostThumbnails(value: unknown) {
  storedHostThumbnails = parseStoredHostThumbnails(value)
  storedHostThumbnails.forEach((item) => {
    const page = pages.value.find(page => thumbnailPageKey(page, pages.value) === item.pageId)
    if (!page || item.revision !== pageThumbnailRevision(page, item.mode)) return
    const records = storedHostThumbnailRecords(item)
    Object.assign(thumbnailManifest.value, Object.fromEntries(records.map(record => [record.slot, record])))
    records.forEach((record) => {
      const url = thumbnailUrl(props.config, record)
      thumbnailResourceCache.set(url, item.source)
      thumbnailResources.value[url] = item.source
    })
  })
  thumbnailManifest.value = { ...thumbnailManifest.value }
  thumbnailResources.value = { ...thumbnailResources.value }
}

async function captureMissingHostThumbnails() {
  if (!props.host?.capturePage || hostThumbnailQueueRunning) return
  hostThumbnailQueueRunning = true
  try {
    const attemptedIds = new Set<string>()
    const { nextMissingHostThumbnail } = await import('./client/host-thumbnail-capture')
    let captured = 0
    while (captured < MAX_HOST_AUTO_THUMBNAILS) {
      const page = nextMissingHostThumbnail(pages.value, {
        activePageId: active.value,
        attemptedIds,
        failedIds: failedHostThumbnailIds,
        pageUrls: hostPageUrls,
        isCurrent: thumbnailIsCurrent,
      })
      if (!page) break
      attemptedIds.add(page.id)
      try {
        await captureHostThumbnail(page, await props.host.capturePage(hostPageUrls.get(page.id)!, {
          width: currentPreviewMode.value.width,
          height: currentPreviewMode.value.height,
        }))
      } catch (error) {
        failedHostThumbnailIds.add(page.id)
        console.warn(`PageFlow failed to capture ${page.path}`, error)
      }
      captured++
    }
  } finally {
    hostThumbnailQueueRunning = false
  }
}

function pagePreviewHeight(pageId: string) {
  if (previewMode.value === 'mobile')
    return Math.round(PAGE_CARD_WIDTH * currentPreviewMode.value.height / currentPreviewMode.value.width)
  const compact = compactThumbnailRecord(pageId)
  const fullRoot = fullThumbnailRecords(pageId)[0]
  const revision = pages.value.find(page => page.id === pageId)
  const currentRevision = revision ? pageThumbnailRevision(revision) : undefined
  const currentCompact = compact?.revision === currentRevision ? compact : undefined
  const currentFullRoot = fullRoot?.revision === currentRevision ? fullRoot : undefined
  return currentCompact?.pageHeight ?? currentCompact?.height ?? currentFullRoot?.pageHeight ?? currentFullRoot?.height
    ?? Math.round(PAGE_CARD_WIDTH * currentPreviewMode.value.height / currentPreviewMode.value.width)
}

function pageCardHeight(pageId: string) {
  return pagePreviewHeight(pageId) + PAGE_CARD_META_HEIGHT
}

function pagePosition(pageId: string) {
  return positions.value.get(pageId) ?? [0, 0]
}

function canvasPagesFor(items: PageFlowPage[], groupPath = routeGroupPath.value) {
  const view = createRouteDeckView(items, groupPath)
  return [...view.directPages, ...view.decks.map(deck => deck.representative)]
}

function centerLayoutHorizontally(source: Map<string, [number, number]>, layoutPages: PageFlowPage[]) {
  const width = canvas.value?.clientWidth ?? 0
  const xs = layoutPages.flatMap(page => source.has(page.id) ? [source.get(page.id)![0]] : [])
  if (!width || !xs.length) return source
  const offset = width / 2 - (Math.min(...xs) + Math.max(...xs) + PAGE_CARD_WIDTH) / 2
  return new Map([...source].map(([id, [x, y]]) => [id, [x + offset, y] as [number, number]]))
}

function canvasLayoutKey(path = routeGroupPath.value) {
  return `/${path.map(segment => encodeURIComponent(segment)).join('/')}`
}

function parseCanvasLayouts(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).flatMap(([key, layout]) => {
    if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return []
    const positions = Object.fromEntries(Object.entries(layout).filter((entry): entry is [string, [number, number]] => {
      const position = entry[1]
      return Array.isArray(position) && position.length === 2 && position.every(item => typeof item === 'number' && Number.isFinite(item))
    }))
    return [[key, positions]]
  }))
}

function restoreCanvasLayout(
  source: Map<string, [number, number]>,
  layoutPages: PageFlowPage[],
  path = routeGroupPath.value,
) {
  const stored = canvasLayouts.value[canvasLayoutKey(path)]
  if (!stored) return source
  const next = new Map(source)
  layoutPages.forEach((page) => {
    const position = stored[page.id]
    if (Array.isArray(position) && position.length === 2 && position.every(Number.isFinite)) next.set(page.id, position)
  })
  return next
}

async function saveCurrentCanvasLayout() {
  const key = canvasLayoutKey()
  const storedPositions = Object.fromEntries(canvasPages.value.flatMap((page) => {
    const position = positions.value.get(page.id)
    return position ? [[page.id, position] as const] : []
  }))
  const nextLayouts = { ...canvasLayouts.value, [key]: storedPositions }
  try {
    if (props.host) {
      if (!hostCanvasOrigin) throw new Error('画板存储尚未就绪')
      hostCanvasStorage = { ...hostCanvasStorage, canvasLayouts: nextLayouts, updatedAt: Date.now() }
      await savePageFlowCanvas(props.host, hostCanvasOrigin, hostCanvasStorage)
    } else {
      const response = await fetch(`${props.config.previewPath}api/canvas-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, positions: storedPositions }),
      })
      if (!response.ok) throw new Error('保存失败')
    }
    canvasLayouts.value = nextLayouts
  } catch {
    status.value = '页面布局保存失败'
  }
}

function layoutRouteGroup(path: string[]) {
  const layoutPagesList = canvasPagesFor(pages.value, path)
  const heights = new Map(layoutPagesList.map(page => [page.id, pageCardHeight(page.id)]))
  const layoutPositions = layoutPageGrid(
    layoutPagesList,
    heights,
    responsivePageGridColumns({
      width: canvas.value?.clientWidth ?? window.innerWidth,
      height: canvas.value?.clientHeight ?? window.innerHeight,
    }, layoutPagesList, heights),
  )
  return {
    pages: layoutPagesList,
    positions: restoreCanvasLayout(centerLayoutHorizontally(layoutPositions, layoutPagesList), layoutPagesList, path),
  }
}

function fitRouteGroupTransform(
  layoutPages: PageFlowPage[],
  layoutPositions: Map<string, [number, number]>,
  maximumScale: number,
): CanvasTransform | undefined {
  if (!canvas.value || !layoutPages.length) return
  const positioned = layoutPages.flatMap(page => {
    const position = layoutPositions.get(page.id)
    return position ? [{ page, position }] : []
  })
  if (!positioned.length) return
  const left = Math.min(...positioned.map(item => item.position[0]))
  const top = Math.min(...positioned.map(item => item.position[1]))
  const right = Math.max(...positioned.map(item => item.position[0] + PAGE_CARD_WIDTH))
  const bottom = Math.max(...positioned.map(item => item.position[1] + pageCardHeight(item.page.id)))
  const viewport = { width: canvas.value.clientWidth, height: canvas.value.clientHeight }
  const padding = 72
  const scale = Math.max(0.05, Math.min(
    maximumScale,
    (viewport.width - padding * 2) / Math.max(1, right - left),
    (viewport.height - padding * 2) / Math.max(1, bottom - top),
  ))
  return {
    x: viewport.width / 2 - (left + right) / 2 * scale,
    y: viewport.height / 2 - (top + bottom) / 2 * scale,
    scaleX: scale,
    scaleY: scale,
  }
}

function requestLayout(nextPages = pages.value, _animate = false) {
  if (!initialSceneReady.value) {
    clearTimeout(initialRevealTimer)
    initialLayoutSettled.value = false
  }
  ++layoutRequestId
  const layoutPagesList = canvasPagesFor(nextPages)
  const heights = new Map(layoutPagesList.map(page => [page.id, pageCardHeight(page.id)]))
  positions.value = restoreCanvasLayout(centerLayoutHorizontally(layoutPageGrid(
    layoutPagesList,
    heights,
    responsivePageGridColumns({
      width: canvas.value?.clientWidth ?? window.innerWidth,
      height: canvas.value?.clientHeight ?? window.innerHeight,
    }, layoutPagesList, heights),
  ), layoutPagesList), layoutPagesList)
  draw()
  initialLayoutSettled.value = true
  scheduleInitialSceneReveal()
}

function animateDeckExpansion(path: string[], sourcePageId: string, next: ReturnType<typeof layoutRouteGroup>, done?: () => void) {
  if (!leafer) return false
  const sourcePosition = positions.value.get(sourcePageId)
  if (!sourcePosition) return false
  const layer = leafer.zoomLayer
  const cameraStart: CanvasTransform = {
    x: layer.x ?? 0,
    y: layer.y ?? 0,
    scaleX: layer.scaleX ?? 1,
    scaleY: layer.scaleY ?? 1,
  }
  const cameraTarget = fitRouteGroupTransform(next.pages, next.positions, cameraStart.scaleX) ?? cameraStart
  const siblingPages = canvasPages.value.filter(page => page.id !== sourcePageId)
  const sourceGroupDepth = routeGroupPath.value.length
  const siblingStarts = new Map(siblingPages.map(page => [page.id, positions.value.get(page.id) ?? sourcePosition]))
  const nextPositions = [...next.positions.values()]
  const minX = Math.min(...nextPositions.map(position => position[0]))
  const maxX = Math.max(...nextPositions.map(position => position[0] + PAGE_CARD_WIDTH))
  const minY = Math.min(...nextPositions.map(position => position[1]))
  const maxY = Math.max(...next.pages.map(page => (next.positions.get(page.id)?.[1] ?? 0) + pageCardHeight(page.id)))
  const parkedTargets = new Map(siblingPages.map((page, index) => {
    const side = index % 4
    const slot = Math.floor(index / 4)
    const horizontalStep = PAGE_CARD_WIDTH * 0.5 + 24
    const verticalStep = pageCardHeight(page.id) * 0.5 + 24
    const height = pageCardHeight(page.id)
    const position: [number, number] = side === 0 ? [minX - PAGE_CARD_WIDTH * 0.75 - PARKED_PAGE_GAP, minY + slot * verticalStep]
      : side === 1 ? [maxX + PARKED_PAGE_GAP - PAGE_CARD_WIDTH * 0.25, minY + slot * verticalStep]
        : side === 2 ? [minX + slot * horizontalStep, minY - height * 0.75 - PARKED_PAGE_GAP]
          : [minX + slot * horizontalStep, maxY + PARKED_PAGE_GAP - height * 0.25]
    return [page.id, position]
  }))
  flightAnimation.cancel()
  if (focusedPageId.value) exitFocus(false)
  routeGroupPath.value = path
  parkedPages.value = { ...parkedPages.value, ...Object.fromEntries(siblingPages.map(page => [page.id, page])) }
  parkedPageDepth.value = {
    ...parkedPageDepth.value,
    ...Object.fromEntries(siblingPages.map(page => [page.id, sourceGroupDepth])),
  }
  parkedPageProgress.value = {
    ...parkedPageProgress.value,
    ...Object.fromEntries(siblingPages.map(page => [page.id, 0])),
  }
  parkedPagePositions.value = {
    ...parkedPagePositions.value,
    ...Object.fromEntries(siblingPages.map(page => [page.id, positions.value.get(page.id) ?? sourcePosition])),
  }
  const starts = new Map(next.pages.map((page, index) => {
    const layer = Math.min(index, MAX_DECK_LAYERS - 1)
    return [page.id, [sourcePosition[0] + layer * 7, sourcePosition[1] - layer * 7] as [number, number]]
  }))
  positions.value = starts
  visiblePageIds.value = new Set(next.pages.map(page => page.id))
  renderCanvasScene()

  viewportInteracting.value = true
  flightAnimation.start(720, progress => {
    const cameraProgress = 1 - (1 - progress) ** 3
    positions.value = new Map(next.pages.map((page, index) => {
      const start = starts.get(page.id)!
      const end = next.positions.get(page.id) ?? start
      const delay = Math.min(index, 8) * 0.025
      const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
      const eased = 1 - (1 - local) ** 3
      return [page.id, [start[0] + (end[0] - start[0]) * eased, start[1] + (end[1] - start[1]) * eased]]
    }))
    parkedPagePositions.value = {
      ...parkedPagePositions.value,
      ...Object.fromEntries(siblingPages.map((page, index) => {
        const start = siblingStarts.get(page.id) ?? sourcePosition
        const end = parkedTargets.get(page.id) ?? start
        const delay = Math.min(index, 8) * 0.02
        const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
        const eased = 1 - (1 - local) ** 3
        return [page.id, [start[0] + (end[0] - start[0]) * eased, start[1] + (end[1] - start[1]) * eased]]
      })),
    }
    parkedPageProgress.value = {
      ...parkedPageProgress.value,
      ...Object.fromEntries(siblingPages.map((page, index) => {
        const delay = Math.min(index, 8) * 0.02
        const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
        return [page.id, 1 - (1 - local) ** 3]
      })),
    }
    layer.set({
      x: cameraStart.x + (cameraTarget.x - cameraStart.x) * cameraProgress,
      y: cameraStart.y + (cameraTarget.y - cameraStart.y) * cameraProgress,
      scaleX: cameraStart.scaleX + (cameraTarget.scaleX - cameraStart.scaleX) * cameraProgress,
      scaleY: cameraStart.scaleY + (cameraTarget.scaleY - cameraStart.scaleY) * cameraProgress,
    })
    renderCanvasScene()
    syncOverlay(false)
  }, () => {
    positions.value = next.positions
    parkedPagePositions.value = { ...parkedPagePositions.value, ...Object.fromEntries(parkedTargets) }
    parkedPageProgress.value = { ...parkedPageProgress.value, ...Object.fromEntries(siblingPages.map(page => [page.id, 1])) }
    layer.set(cameraTarget)
    viewportInteracting.value = false
    renderCanvasScene()
    syncOverlay(true)
    done?.()
  })
  return true
}

function animateDeckCollapse(path: string[], next: ReturnType<typeof layoutRouteGroup>, done?: () => void) {
  if (!leafer || !routeGroupPath.value.length) return false
  const parentView = createRouteDeckView(pages.value, path)
  const currentKey = routeGroupPath.value.join('/')
  const targetDeck = parentView.decks.find(deck => currentKey === deck.key || currentKey.startsWith(`${deck.key}/`))
  const targetPosition = targetDeck && next.positions.get(targetDeck.representative.id)
  if (!targetDeck || !targetPosition) return false
  flightAnimation.cancel()
  if (focusedPageId.value) exitFocus(false)
  const currentPages = canvasPages.value
  const restoringPages = next.pages.filter(page => parkedPages.value[page.id])
  const restoringStarts = new Map(restoringPages.map(page => [page.id, parkedPagePositions.value[page.id]]))
  const starts = new Map(currentPages.map(page => [page.id, positions.value.get(page.id) ?? targetPosition]))
  viewportInteracting.value = true
  flightAnimation.start(680, progress => {
    positions.value = new Map(currentPages.map((page, index) => {
      const start = starts.get(page.id)!
      const stackLayer = Math.min(index, MAX_DECK_LAYERS - 1)
      const end: [number, number] = [targetPosition[0] + stackLayer * 7, targetPosition[1] - stackLayer * 7]
      const delay = Math.min(currentPages.length - index - 1, 8) * 0.02
      const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
      const eased = 1 - (1 - local) ** 3
      return [page.id, [start[0] + (end[0] - start[0]) * eased, start[1] + (end[1] - start[1]) * eased]]
    }))
    parkedPagePositions.value = {
      ...parkedPagePositions.value,
      ...Object.fromEntries(restoringPages.map((page, index) => {
        const start = restoringStarts.get(page.id)!
        const end = next.positions.get(page.id) ?? start
        const delay = Math.min(index, 8) * 0.02
        const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
        const eased = 1 - (1 - local) ** 3
        return [page.id, [start[0] + (end[0] - start[0]) * eased, start[1] + (end[1] - start[1]) * eased]]
      })),
    }
    parkedPageProgress.value = {
      ...parkedPageProgress.value,
      ...Object.fromEntries(restoringPages.map((page, index) => {
        const delay = Math.min(index, 8) * 0.02
        const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
        return [page.id, (1 - local) ** 3]
      })),
    }
    renderCanvasScene()
    syncOverlay(false)
  }, () => {
    routeGroupPath.value = path
    positions.value = next.positions
    const keepParked = (id: string) => (parkedPageDepth.value[id] ?? 0) < path.length
    parkedPages.value = Object.fromEntries(Object.entries(parkedPages.value).filter(([id]) => keepParked(id)))
    parkedPagePositions.value = Object.fromEntries(Object.entries(parkedPagePositions.value).filter(([id]) => keepParked(id)))
    parkedPageDepth.value = Object.fromEntries(Object.entries(parkedPageDepth.value).filter(([id]) => keepParked(id)))
    parkedPageProgress.value = Object.fromEntries(Object.entries(parkedPageProgress.value).filter(([id]) => keepParked(id)))
    visiblePageIds.value = new Set(next.pages.map(page => page.id))
    viewportInteracting.value = false
    renderCanvasScene()
    syncOverlay(true)
    done?.()
  })
  return true
}

function animateToRouteGroup(targetPath: string[], done: () => void) {
  const currentPath = routeGroupPath.value
  const commonDepth = currentPath.findIndex((segment, index) => segment !== targetPath[index])
  const sharedLength = commonDepth < 0 ? Math.min(currentPath.length, targetPath.length) : commonDepth
  if (currentPath.length > sharedLength) {
    const parentPath = currentPath.slice(0, -1)
    const next = layoutRouteGroup(parentPath)
    if (animateDeckCollapse(parentPath, next, () => animateToRouteGroup(targetPath, done))) return
    routeGroupPath.value = parentPath
    positions.value = next.positions
    animateToRouteGroup(targetPath, done)
    return
  }
  if (currentPath.length < targetPath.length) {
    const nextPath = targetPath.slice(0, currentPath.length + 1)
    const currentView = createRouteDeckView(pages.value, currentPath)
    const nextKey = nextPath.join('/')
    const sourceDeck = currentView.decks.find(deck => deck.key === nextKey)
    const next = layoutRouteGroup(nextPath)
    if (sourceDeck && animateDeckExpansion(nextPath, sourceDeck.representative.id, next, () => animateToRouteGroup(targetPath, done))) return
    routeGroupPath.value = nextPath
    positions.value = next.positions
    animateToRouteGroup(targetPath, done)
    return
  }
  done()
}

function enterRouteGroup(path: string[], animate = true, sourceDeckPageId?: string) {
  const next = layoutRouteGroup(path)
  if (animate && sourceDeckPageId && animateDeckExpansion(path, sourceDeckPageId, next)) return
  const returningToAncestor = path.length < routeGroupPath.value.length
    && path.every((segment, index) => segment === routeGroupPath.value[index])
  if (animate && returningToAncestor && animateDeckCollapse(path, next)) return
  const apply = () => {
    if (focusedPageId.value) exitFocus(false)
    routeGroupPath.value = path
    positions.value = next.positions
    visiblePageIds.value = new Set(next.pages.map(page => page.id))
    scheduleCanvasRender()
  }
  const target = next.pages[0]
  const targetPosition = target && next.positions.get(target.id)
  if (animate && target && targetPosition && leafer)
    flyToPage(target.id, targetPosition, apply, 1, { x: 0, y: 0, scaleX: 1, scaleY: 1 })
  else {
    apply()
    if (leafer) {
      leafer.zoomLayer.set({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
      syncOverlay(true)
    }
  }
}

function scheduleInitialSceneReveal() {
  if (initialSceneReady.value || !thumbnailManifestLoaded.value || !initialLayoutSettled.value || !initialResourcesSettled.value) return
  clearTimeout(initialRevealTimer)
  initialRevealTimer = setTimeout(() => { initialSceneReady.value = true }, 120)
}

function previewUrl(path: string) {
  const page = pages.value.find(item => item.path === path)
  const selectedUser = page ? pageUsers.value[page.id] ?? activeUser.value : activeUser.value
  const user = selectedUser === '默认用户' ? undefined : selectedUser
  const resolvedPath = resolvePreviewUrl(path, props.config, window.location.origin, routeMode.value, navigationLocations.value[path], user)
  const resolved = props.host ? new URL(resolvedPath, props.config.appUrl).href : resolvedPath
  if (!page || page.id !== focusedPageId.value) return resolved
  const url = new URL(resolved, window.location.origin)
  url.searchParams.set('__unplugin_pageflow_inspect', '1')
  if (props.host) return url.href
  return `${url.pathname}${url.search}${url.hash}`
}

function refreshSessionUsers() {
  const next = visibleSessionUsers(initialUserSessions.users, props.config.previewRoles, cachedPreviewUsers())
  if (JSON.stringify(next) === JSON.stringify(users.value)) return
  users.value = next
  if (!users.value.includes(activeUser.value ?? '')) activeUser.value = users.value[0]
}

function handlePageFlowStorage(event: StorageEvent) {
  if (isPreviewUserStorageKey(event.key)) refreshSessionUsers()
  if (event.key === PAGEFLOW_TODOS_STORAGE_KEY) {
    try { pageTodos.value = parsePageFlowTodos(event.newValue ? JSON.parse(event.newValue) : undefined) }
    catch { pageTodos.value = {} }
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') scheduleNextCapture()
  else cancelScheduledCapture()
}

function selectActiveUser(user: string) {
  activeUser.value = user
  saveCurrentUserSessions(user)
}

function saveCurrentUserSessions(selectedUser = activeUser.value) {
  const configured = new Set(configuredUsers(props.config.previewRoles))
  saveUserSessions({ users: users.value.filter(user => !configured.has(user)), notes: userNotes.value, activeUser: selectedUser, pageUsers: pageUsers.value })
}

function selectPageUser(pageId: string, user: string) {
  pageUsers.value = { ...pageUsers.value, [pageId]: user }
  saveCurrentUserSessions()
}

function setUserNote(user: string, note: string) {
  userNotes.value = { ...userNotes.value, [user]: note.trim() }
  saveCurrentUserSessions()
}

function editUserNote(user: string) {
  const note = window.prompt(`输入 ${user} 的备注`, userNotes.value[user] ?? '')
  if (note == null) return
  setUserNote(user, note)
}

function pageThumbnailRevision(page: PageFlowPage, mode = previewMode.value) {
  const revision = thumbnailRevision(page)
  return mode === 'pc'
    ? `${revision}:${currentPreviewMode.value.width}x${currentPreviewMode.value.height}`
    : revision
}

function syncOverlay(updateVisiblePages = true) {
  if (!leafer || !overlayWorld.value) return
  const layer = leafer.zoomLayer
  const transform = {
    x: layer.x ?? 0,
    y: layer.y ?? 0,
    scaleX: layer.scaleX ?? 1,
    scaleY: layer.scaleY ?? 1,
  }
  if (!viewportInteracting.value) {
    zoomPercent.value = Math.round(transform.scaleX * 100)
    thumbnailTier.value = thumbnailTierForZoom(zoomPercent.value)
  }
  overlayWorld.value.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scaleX}, ${transform.scaleY})`
  connectionLeafer?.zoomLayer.set(transform)
  if (!updateVisiblePages) return
  settledTransform.value = transform
  const nextVisible = getVisiblePageIds(
    canvasPages.value,
    positions.value,
    { width: canvas.value?.clientWidth ?? 0, height: canvas.value?.clientHeight ?? 0 },
    transform,
    240,
    cardHeights.value,
    canvasPages.value.length,
    spatialIndex.value,
  )
  let sceneChanged = false
  if (nextVisible.size !== visiblePageIds.value.size || [...nextVisible].some(id => !visiblePageIds.value.has(id)))
  {
    visiblePageIds.value = nextVisible
    sceneChanged = true
  }
  if (sceneChanged) scheduleCanvasRender()
  scheduleNextCapture()
}

function handleViewportTransform() {
  viewportInteracting.value = true
  if (focusedPageId.value) suppressCanvasClickUntil = performance.now() + 400
  cancelScheduledCapture()
  backgroundCaptureNotBefore = Date.now() + BACKGROUND_CAPTURE_INTERACTION_DELAY
  if (!viewportFrame) viewportFrame = requestAnimationFrame(() => {
    viewportFrame = 0
    syncOverlay(false)
  })
  clearTimeout(viewportIdleTimer)
  viewportIdleTimer = setTimeout(() => {
    viewportInteracting.value = false
    syncOverlay(true)
  }, 200)
}

function shouldRenderPreview(pageId: string) {
  if (props.config.previewPath === '/') return false
  if (capturePreviewId.value === pageId) return true
  if (focusedPageId.value) return pageId === focusedPageId.value
  return livePreviewCacheIds.value.includes(pageId)
}

function cancelScheduledCapture() {
  captureQueue.cancel()
}

function scheduleNextCapture() {
  if (!thumbnailManifestLoaded.value || capturePreviewId.value || viewportInteracting.value
    || document.visibilityState !== 'visible' || runningPageTestIds.value.size || lighthouseLoading.value) return
  const hasManualCapture = manualCaptureIds.size > 0
  if (hasManualCapture && captureQueue.scheduled) cancelScheduledCapture()
  if (captureQueue.scheduled) return
  const plan = planNextCapture({
    pages: pages.value,
    batchIds: captureBatchIds,
    manualIds: manualCaptureIds,
    priorityIds: new Set([livePreviewId.value, focusedPageId.value, ...visiblePageIds.value].filter(Boolean) as string[]),
    failedIds: failedPreviewIds,
    isCurrent: thumbnailIsCurrent,
  })
  captureBatchIds = plan.batchIds
  if (!plan.pageId) return
  const delay = hasManualCapture
    ? 0
    : Math.max(plan.priority ? PRIORITY_CAPTURE_DELAY : OFFSCREEN_CAPTURE_DELAY, backgroundCaptureNotBefore - Date.now())
  captureQueue.schedule(delay, !hasManualCapture, startNextCapture)
}

function startNextCapture() {
  if (!thumbnailManifestLoaded.value || capturePreviewId.value || viewportInteracting.value) return
  const plan = planNextCapture({
    pages: pages.value,
    batchIds: captureBatchIds,
    manualIds: manualCaptureIds,
    priorityIds: new Set([livePreviewId.value, focusedPageId.value, ...visiblePageIds.value].filter(Boolean) as string[]),
    failedIds: failedPreviewIds,
    isCurrent: thumbnailIsCurrent,
  })
  captureBatchIds = plan.batchIds
  capturePreviewId.value = plan.pageId
  const pageId = plan.pageId
  if (pageId) void nextTick(() => {
    const frame = previewFrames.get(pageId)
    if (frame?.contentDocument?.readyState === 'complete')
      void capturePreview(pageId, frame, plan.manual)
  })
}

function finishCapture(pageId: string) {
  captureBatchIds.delete(pageId)
  manualCaptureIds.delete(pageId)
  capturePreviewId.value = undefined
  if (Object.keys(pendingThumbnailRecords).length) {
    thumbnailManifest.value = { ...thumbnailManifest.value, ...pendingThumbnailRecords }
    Object.keys(pendingThumbnailRecords).forEach(id => delete pendingThumbnailRecords[id])
  }
  captureQueue.complete(pageId)
  if (!captureBatchIds.size) {
    requestLayout()
  }
  scheduleNextCapture()
}

function cacheCurrentFocusedLinks() {
  const page = pages.value.find(item => item.id === focusedPageId.value)
  if (!page) return
  focusedPageStateCache.set(
    page,
    focusedLinksScannedPageId === page.id ? focusedLinks.value : undefined,
    focusedTargetPositions.value,
  )
}

function activatePreview(pageId: string, animate = true) {
  if (animate && focusedPageId.value && focusedPageId.value !== pageId) {
    if (focusTransitionTargetId) return
    focusTransitionTargetId = pageId
    animateFocusLayout(0, () => {
      clearFocus()
      focusTransitionTargetId = undefined
      activatePreview(pageId, true)
    })
    return
  }
  const page = pages.value.find(item => item.id === pageId)
  const cached = page ? focusedPageStateCache.get(page) : undefined
  const cachedLinks = cached?.links ?? (props.host ? page?.links : undefined)
  const targetGroupPath = page ? routeDeckPathForPage(pages.value, pageId) : []
  const groupChanged = targetGroupPath.length !== routeGroupPath.value.length
    || targetGroupPath.some((segment, index) => segment !== routeGroupPath.value[index])
  const next = groupChanged || !positions.value.has(pageId) ? layoutRouteGroup(targetGroupPath) : undefined
  if (animate && groupChanged) {
    if (routeTransitionTargetId) return
    routeTransitionTargetId = pageId
    animateToRouteGroup(targetGroupPath, () => {
      routeTransitionTargetId = undefined
      activatePreview(pageId, true)
    })
    return
  }
  const targetPosition = next?.positions.get(pageId) ?? positions.value.get(pageId)
  const apply = () => {
    cacheCurrentFocusedLinks()
    if (next) {
      routeGroupPath.value = targetGroupPath
      positions.value = next.positions
      visiblePageIds.value = new Set(next.pages.map(item => item.id))
      parkedPages.value = {}
      parkedPagePositions.value = {}
      parkedPageDepth.value = {}
      parkedPageProgress.value = {}
    }
    active.value = pageId
    apiResultsByPage.value = { ...apiResultsByPage.value, [pageId]: [] }
    focusedPageId.value = pageId
    focusedLinksScannedPageId = cachedLinks ? pageId : undefined
    focusAnimation.cancel()
    focusLayoutProgress = 0
    focusedLinks.value = cachedLinks ?? []
    setHoveredHotspot(undefined, false)
    focusedTargetPositions.value = cached?.positions ?? {}
    livePreviewId.value = pageId
    livePreviewCacheIds.value = touchPreviewCache(livePreviewCacheIds.value, pageId)
    failedPreviewIds.delete(pageId)
    scheduleCanvasRender()
    if (!animate) centerFocusedPage(pageId)
    scheduleNextCapture()
    if (cachedLinks) void requestFocusedLayout()
    else void nextTick(() => requestFocusedPageScan(pageId))
  }
  if (animate && targetPosition && leafer)
    flyToPage(pageId, targetPosition, apply, Math.max(leafer.zoomLayer.scaleX ?? 1, PAGEFLOW_AUTO_PREVIEW_SCALE))
  else apply()
}

function selectSearchPage(pageId: string) {
  searchSelection.value = undefined
  searchOpen.value = false
  activatePreview(pageId)
}

function handleSearchShortcut(event: KeyboardEvent) {
  if (event.key === 'Escape' && focusedPageId.value) {
    event.preventDefault()
    exitFocusAfterSnapshot(() => zoomCanvas('out'))
    return
  }
  if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) return
  event.preventDefault()
  searchOpen.value = true
  void nextTick(() => searchRoot.value?.querySelector('input')?.focus())
}

function centerFocusedPage(pageId: string) {
  if (!leafer || !canvas.value) return
  const position = positions.value.get(pageId)
  if (!position) return
  const transform = fitFocusedPreviewTransform(
    position,
    pagePreviewHeight(pageId),
    { width: canvas.value.clientWidth, height: canvas.value.clientHeight },
    SELECTED_PAGE_SCALE,
    32,
    16,
    currentPreviewMode.value.width,
  )
  leafer.zoomLayer.set(transform)
  syncOverlay(false)
}

function requestFocusedPageScan(pageId: string) {
  if (focusedPageId.value !== pageId) return
  previewFrames.get(pageId)?.contentWindow?.postMessage({ type: PAGEFLOW_SCAN_MESSAGE }, window.location.origin)
}

function requestFocusedDiagnostics() {
  window.clearTimeout(diagnosticsRequestTimer)
  diagnosticsRequestTimer = window.setTimeout(runFocusedDiagnostics, 300)
}

function cachedPageDiagnostics(page: PageFlowPage | undefined) {
  if (!page) return
  const cached = diagnosticsByPage.get(page.id)
  return cached?.revision === (page.revision ?? '') ? cached.diagnostics : undefined
}

function runFocusedDiagnostics() {
  const pageId = focusedPageId.value
  const frame = pageId ? previewFrames.get(pageId) : undefined
  if (!frame?.contentWindow) return
  if (diagnosticsInFlightPageId === pageId) {
    diagnosticsRefreshQueued = true
    return
  }
  diagnosticsInFlightPageId = pageId
  diagnosticsRefreshQueued = false
  diagnosticsLoading.value = true
  window.clearTimeout(diagnosticsTimer)
  diagnosticsTimer = window.setTimeout(() => {
    if (diagnosticsInFlightPageId !== pageId) return
    diagnosticsInFlightPageId = undefined
    diagnosticsLoading.value = false
    if (diagnosticsRefreshQueued) requestFocusedDiagnostics()
  }, 10_000)
  void pageFlowHost.scan()
}

function highlightDiagnostic(item: PageFlowDiagnostic) {
  const pageId = focusedPageId.value
  if (!pageId || !item.selector) return
  const highlight = () => void pageFlowHost.highlight(item.selector!)
  const position = positions.value.get(pageId)
  if (!position || !leafer || !canvas.value) {
    highlight()
    return
  }
  const pageTransform = fitFocusedPreviewTransform(
    position,
    pagePreviewHeight(pageId),
    { width: canvas.value.clientWidth, height: canvas.value.clientHeight },
    SELECTED_PAGE_SCALE,
    32,
    16,
    currentPreviewMode.value.width,
  )
  const transform = item.bounds
    ? centerDiagnosticTransform(
        item.bounds,
        position,
        currentPreviewMode.value.width,
        { width: canvas.value.clientWidth, height: canvas.value.clientHeight },
        pageTransform.scaleX,
      )
    : pageTransform
  flyToPage(pageId, position, highlight, undefined, transform)
}

function diagnosticMeasurement(item: PageFlowDiagnostic) {
  if (!item.measured) return ''
  return Object.entries(item.measured).map(([key, value]) => `${key}: ${value}`).join(' · ')
}

function requestFocusedLayout() {
  if (focusTransitionTargetId) return
  focusLayoutProgress = 0
  renderCanvasScene()
  animateFocusLayout(1)
}

function clearFocus() {
  cacheCurrentFocusedLinks()
  focusedLinksScannedPageId = undefined
  focusedPageId.value = undefined
  focusedLinks.value = []
  focusedTargetPositions.value = {}
  setHoveredHotspot(undefined, false)
  livePreviewId.value = undefined
  focusLayoutProgress = 0
  scheduleCanvasRender()
}

function animateFocusLayout(target: 0 | 1, done?: () => void) {
  const from = focusLayoutProgress
  focusAnimation.start(360, progress => {
    const eased = 1 - (1 - progress) ** 3
    focusLayoutProgress = from + (target - from) * eased
    renderCanvasScene()
  }, done)
}

function exitFocus(animated = true, done?: () => void) {
  if (!focusedPageId.value) return
  if (animated) animateFocusLayout(0, () => {
    clearFocus()
    done?.()
  })
  else {
    focusAnimation.cancel()
    clearFocus()
    done?.()
  }
}

function waitForCapture(pageId: string, timeoutMs = 35000) {
  return captureQueue.waitFor(pageId, timeoutMs)
}

async function captureFocusedPageForHost() {
  const pageId = focusedPageId.value
  const frame = pageId ? previewFrames.get(pageId) : undefined
  if (!pageId || !frame) throw new Error('PageFlow 没有可截图的聚焦页面')
  cancelScheduledCapture()
  capturePreviewId.value = pageId
  forcedThumbnailRefreshIds.add(pageId)
  manualCaptureIds.add(pageId)
  await capturePreview(pageId, frame, true)
  const record = compactThumbnailRecord(pageId)
  if (!record) throw new Error('PageFlow 截图没有生成缩略图')
  const response = await fetch(thumbnailUrl(props.config, record))
  if (!response.ok) throw new Error(`PageFlow 截图读取失败 (${response.status})`)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('PageFlow 截图读取失败'))
    void response.blob().then(blob => reader.readAsDataURL(blob), reject)
  })
}

function exitFocusAfterSnapshot(done?: () => void) {
  const pageId = focusedPageId.value
  if (!pageId || focusExitPending) return
  focusExitPending = true
  const exitAfterCapture = async () => {
    const activeCaptureId = capturePreviewId.value
    if (activeCaptureId && capturesInProgress.has(activeCaptureId))
      await waitForCapture(activeCaptureId)
    if (focusedPageId.value !== pageId) {
      focusExitPending = false
      return
    }
    cancelScheduledCapture()
    if (capturePreviewId.value) captureBatchIds.delete(capturePreviewId.value)
    capturePreviewId.value = pageId
    forcedThumbnailRefreshIds.add(pageId)
    failedPreviewIds.delete(pageId)
    manualCaptureIds.add(pageId)
    const frame = previewFrames.get(pageId)
    if (frame) await capturePreview(pageId, frame, true)
    else {
      capturePreviewId.value = undefined
      forcedThumbnailRefreshIds.delete(pageId)
      manualCaptureIds.delete(pageId)
    }
    if (focusedPageId.value !== pageId) {
      focusExitPending = false
      return
    }
    exitFocus(true, () => {
      focusExitPending = false
      done?.()
    })
  }
  void exitAfterCapture()
}

async function copyPagePath(path: string) {
  try {
    await navigator.clipboard.writeText(path)
    copiedPath.value = path
    clearTimeout(copiedPathTimer)
    copiedPathTimer = setTimeout(() => { copiedPath.value = undefined }, 1400)
  } catch {
    copiedPath.value = undefined
  }
}

function openPage(path: string) {
  window.open(previewUrl(path), '_blank', 'noopener,noreferrer')
}

function groupDisplayName(key: string, fallback: string) {
  return groupNames.value[key] || fallback
}

async function editGroupName(key: string, fallback: string) {
  const current = groupDisplayName(key, fallback)
  const input = window.prompt('编辑分组名称（留空恢复路由名称）', current)
  if (input == null) return
  const name = input.trim()
  const next = { ...groupNames.value }
  if (name) next[key] = name
  else delete next[key]
  try {
    if (props.host) {
      if (!hostCanvasOrigin) throw new Error('画板存储尚未就绪')
      hostCanvasStorage = { ...hostCanvasStorage, groupNames: next, updatedAt: Date.now() }
      await savePageFlowCanvas(props.host, hostCanvasOrigin, hostCanvasStorage)
    } else {
      const response = await fetch(`${props.config.previewPath}api/group-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, name }),
      })
      if (!response.ok) throw new Error('保存失败')
    }
    groupNames.value = next
    scheduleCanvasRender()
  } catch {
    status.value = '分组名称保存失败'
  }
}

function handleCanvasClick(event: MouseEvent) {
  if (!leafer || !canvas.value || viewportInteracting.value) return
  if (performance.now() < suppressCanvasClickUntil || performance.now() - focusTargetDraggedAt < 160) return
  const bounds = canvas.value.getBoundingClientRect()
  const layer = leafer.zoomLayer
  const worldX = (event.clientX - bounds.left - (layer.x ?? 0)) / (layer.scaleX ?? 1)
  const worldY = (event.clientY - bounds.top - (layer.y ?? 0)) / (layer.scaleY ?? 1)
  const focus = focusScene.value
  if (focus) {
    const target = [...focus.targets].reverse().find(item => worldX >= item.x
      && worldX <= item.x + PAGE_CARD_WIDTH * item.scale
      && worldY >= item.y
      && worldY <= item.y + pageCardHeight(item.page.id) * item.scale)
    if (target) {
      activatePreview(target.page.id)
      return
    }
    const [sourceX, sourceY] = focus.sourcePosition
    const sourcePreviewH = pagePreviewHeight(focus.source.id)
    const sourceLocalX = worldX - sourceX
    const sourceLocalY = worldY - sourceY
    if (sourceLocalX >= PAGE_CARD_WIDTH - 30 && sourceLocalX <= PAGE_CARD_WIDTH && sourceLocalY >= sourcePreviewH + 30 && sourceLocalY <= sourcePreviewH + 58) openPage(focus.source.path)
    else if (sourceLocalX >= 0 && sourceLocalX < PAGE_CARD_WIDTH - 30 && sourceLocalY >= sourcePreviewH + 32 && sourceLocalY <= sourcePreviewH + 56) void copyPagePath(focus.source.path)
    else if (!(sourceLocalX >= 0 && sourceLocalX <= PAGE_CARD_WIDTH && sourceLocalY >= 0 && sourceLocalY <= sourcePreviewH)) void exitFocusAfterSnapshot()
    return
  }
  const page = [...pages.value].reverse().find(item => {
    if (!visiblePageIds.value.has(item.id)) return false
    const position = positions.value.get(item.id)
    if (!position) return false
    const previewH = pagePreviewHeight(item.id)
    const insideCard = worldX >= position[0] && worldX <= position[0] + PAGE_CARD_WIDTH
      && worldY >= position[1] && worldY <= position[1] + previewH + 56
    return insideCard
  })
  if (!page) {
    const promotedPath = promotedRouteGroupPath(pages.value)
    if (routeGroupPath.value.length > promotedPath.length) enterRouteGroup(routeGroupPath.value.slice(0, -1))
    return
  }
  const deck = routeDeckByPageId.value.get(page.id)
  if (deck) {
    const position = positions.value.get(page.id)!
    const localY = worldY - position[1]
    const previewH = pagePreviewHeight(page.id)
    if (localY >= previewH + 6 && localY <= previewH + 34) {
      void editGroupName(deck.key, deck.label)
      return
    }
    enterRouteGroup(deck.key.split('/').filter(Boolean), true, page.id)
    return
  }
  const position = positions.value.get(page.id)!
  const localX = worldX - position[0]
  const localY = worldY - position[1]
  const previewH = pagePreviewHeight(page.id)
  if (localX >= PAGE_CARD_WIDTH - 30 && localX <= PAGE_CARD_WIDTH && localY >= previewH + 30 && localY <= previewH + 58) openPage(page.path)
  else if (localX >= 0 && localX < PAGE_CARD_WIDTH - 30 && localY >= previewH + 32 && localY <= previewH + 56) void copyPagePath(page.path)
  else if (localX >= 0 && localX <= PAGE_CARD_WIDTH && localY >= 0 && localY <= previewH) activatePreview(page.id)
}

function handleFocusTargetPointerDown(event: PointerEvent) {
  if (!leafer || !canvas.value || event.button !== 0) return
  const focus = focusScene.value
  const bounds = canvas.value.getBoundingClientRect()
  const layer = leafer.zoomLayer
  const worldX = (event.clientX - bounds.left - (layer.x ?? 0)) / (layer.scaleX ?? 1)
  const worldY = (event.clientY - bounds.top - (layer.y ?? 0)) / (layer.scaleY ?? 1)
  if (!focus) {
    const page = [...canvasPages.value].reverse().find((item) => {
      const position = positions.value.get(item.id)
      return position && worldX >= position[0] && worldX <= position[0] + PAGE_CARD_WIDTH
        && worldY >= position[1] && worldY <= position[1] + pageCardHeight(item.id)
    })
    const position = page ? positions.value.get(page.id) : undefined
    if (!page || !position) return
    canvasPageDrag = {
      pointerId: event.pointerId,
      pageId: page.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: position[0],
      startY: position[1],
      moved: false,
    }
    event.preventDefault()
    event.stopPropagation()
    return
  }
  const target = [...focus.targets].reverse().find(item => worldX >= item.x
    && worldX <= item.x + PAGE_CARD_WIDTH * item.scale
    && worldY >= item.y
    && worldY <= item.y + pageCardHeight(item.page.id) * item.scale)
  if (!target) return
  focusTargetDrag = {
    pointerId: event.pointerId,
    pageId: target.page.id,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: target.x,
    startY: target.y,
    moved: false,
  }
  event.preventDefault()
  event.stopPropagation()
}

function handleFocusTargetPointerMove(event: PointerEvent) {
  const canvasDrag = canvasPageDrag
  if (canvasDrag && canvasDrag.pointerId === event.pointerId && leafer) {
    const scale = leafer.zoomLayer.scaleX ?? 1
    const deltaX = (event.clientX - canvasDrag.startClientX) / scale
    const deltaY = (event.clientY - canvasDrag.startClientY) / scale
    if (!canvasDrag.moved && Math.hypot(deltaX, deltaY) < 3) return
    canvasDrag.moved = true
    focusTargetDraggedAt = performance.now()
    positions.value = new Map(positions.value).set(canvasDrag.pageId, [canvasDrag.startX + deltaX, canvasDrag.startY + deltaY])
    scheduleCanvasRender()
    event.preventDefault()
    event.stopPropagation()
    return
  }
  const drag = focusTargetDrag
  if (!drag || drag.pointerId !== event.pointerId || !leafer) return
  const scale = leafer.zoomLayer.scaleX ?? 1
  const deltaX = (event.clientX - drag.startClientX) / scale
  const deltaY = (event.clientY - drag.startClientY) / scale
  if (!drag.moved && Math.hypot(deltaX, deltaY) < 3) return
  drag.moved = true
  focusTargetDraggedAt = performance.now()
  focusedTargetPositions.value = {
    ...focusedTargetPositions.value,
    [drag.pageId]: [drag.startX + deltaX, drag.startY + deltaY],
  }
  scheduleCanvasRender()
  event.preventDefault()
  event.stopPropagation()
}

function handleFocusTargetHover(event: PointerEvent) {
  if (focusTargetDrag || canvasPageDrag || !leafer || !canvas.value) return
  const focus = focusScene.value
  if (!focus) return
  const bounds = canvas.value.getBoundingClientRect()
  const layer = leafer.zoomLayer
  const worldX = (event.clientX - bounds.left - (layer.x ?? 0)) / (layer.scaleX ?? 1)
  const worldY = (event.clientY - bounds.top - (layer.y ?? 0)) / (layer.scaleY ?? 1)
  const target = [...focus.targets].reverse().find(item => worldX >= item.x
    && worldX <= item.x + PAGE_CARD_WIDTH * item.scale
    && worldY >= item.y
    && worldY <= item.y + pageCardHeight(item.page.id) * item.scale)
  const currentPageId = hoveredHotspot.value?.centerX == null ? hoveredHotspot.value?.targets[0] : undefined
  if (target?.page.id === currentPageId) return
  setHoveredHotspot(target ? { targets: [target.page.id] } : undefined)
}

function handleCanvasCursor(event: PointerEvent) {
  if (!canvas.value || !leafer) return
  const canvasView = canvas.value.querySelector<HTMLElement>('.leafer-canvas-view')
  const setCursor = (cursor: 'default' | 'pointer' | 'move') => {
    if (!canvas.value) return
    canvas.value.style.cursor = cursor
    if (canvasView) canvasView.style.cursor = cursor
  }
  if (focusTargetDrag || canvasPageDrag) {
    setCursor('move')
    return
  }
  const bounds = canvas.value.getBoundingClientRect()
  const layer = leafer.zoomLayer
  const scale = layer.scaleX ?? 1
  const worldX = (event.clientX - bounds.left - (layer.x ?? 0)) / scale
  const worldY = (event.clientY - bounds.top - (layer.y ?? 0)) / scale
  const candidates = focusScene.value
    ? [focusScene.value.source, ...focusScene.value.targets.map(target => target.page)]
    : pages.value.filter(page => visiblePageIds.value.has(page.id))
  let linkHit = false
  const pageHit = candidates.some(page => {
    const position = focusScene.value?.source.id === page.id
      ? focusScene.value.sourcePosition
      : (focusScene.value?.targets.find(target => target.page.id === page.id)
        ? [focusScene.value.targets.find(target => target.page.id === page.id)!.x, focusScene.value.targets.find(target => target.page.id === page.id)!.y] as [number, number]
        : positions.value.get(page.id))
    if (!position) return false
    const localX = worldX - position[0]
    const localY = worldY - position[1]
    const previewHeight = pagePreviewHeight(page.id)
    const hit = localX >= 0 && localX <= PAGE_CARD_WIDTH
      && localY >= 0 && localY <= pageCardHeight(page.id)
    if (hit) {
      const arrowHit = localX >= PAGE_CARD_WIDTH - 28
        && localY >= previewHeight + 6 && localY <= previewHeight + 32
      const pathHit = localY >= previewHeight + 32 && localY <= previewHeight + 60
      linkHit = arrowHit || pathHit
    }
    return hit
  })
  if (linkHit) {
    setTimeout(() => {
      setCursor('pointer')
    }, 0)
  } else if (pageHit) {
    setTimeout(() => {
      setCursor(focusScene.value ? 'default' : 'move')
    }, 0)
  } else {
    setTimeout(() => {
      setCursor('pointer')
    }, 0)
  }
}

function clearFocusTargetHover() {
  if (focusTargetDrag || canvasPageDrag || hoveredHotspot.value?.centerX != null) return
  setHoveredHotspot(undefined)
}

function handleFocusTargetPointerUp(event: PointerEvent) {
  if (canvasPageDrag && canvasPageDrag.pointerId === event.pointerId) {
    const moved = canvasPageDrag.moved
    canvasPageDrag = undefined
    if (moved) {
      focusTargetDraggedAt = performance.now()
      suppressCanvasClickUntil = performance.now() + 500
      void saveCurrentCanvasLayout()
      event.preventDefault()
      event.stopPropagation()
    }
    return
  }
  if (!focusTargetDrag || focusTargetDrag.pointerId !== event.pointerId) return
  if (focusTargetDrag.moved) {
    focusTargetDraggedAt = performance.now()
    suppressCanvasClickUntil = performance.now() + 500
    event.preventDefault()
    event.stopPropagation()
  }
  focusTargetDrag = undefined
  handleFocusTargetHover(event)
}

function setPreviewFrame(pageId: string, element: Element | null) {
  if (element instanceof HTMLIFrameElement) {
    if (previewFrames.set(pageId, element)) {
      loadedPreviewIds.value = new Set([...loadedPreviewIds.value].filter(id => id !== pageId))
      readyPreviewIds.value = new Set([...readyPreviewIds.value].filter(id => id !== pageId))
    }
  } else {
    previewFrames.remove(pageId)
  }
}

let captureFramePageId: string | undefined
watch([captureOnlyPage, captureFrameElement], ([page, frame]) => {
  if (captureFramePageId && captureFramePageId !== page?.id) previewFrames.remove(captureFramePageId)
  captureFramePageId = undefined
  if (page && frame) {
    setPreviewFrame(page.id, frame)
    captureFramePageId = page.id
  }
}, { flush: 'post' })

function handleCaptureFrameLoad(frame: HTMLIFrameElement) {
  const page = captureOnlyPage.value
  if (page) void handlePreviewLoad(page.id, frame)
}

function syncPreviewHotspots(pageId: string) {
  const layer = previewFrames.get(pageId)?.contentDocument?.querySelector<HTMLElement>('[data-unplugin-pageflow-hotspot-layer]')
  if (layer) layer.style.display = focusedPageId.value === pageId ? 'block' : 'none'
}

function applyDetectedPcPreviewSize(frame: HTMLIFrameElement) {
  if (pcDesignSizeDetected || previewMode.value !== 'pc' || !frame.contentDocument || !frame.contentWindow) return false
  const detectedSize = detectScaledPreviewSize(frame.contentDocument, {
    width: frame.contentWindow.innerWidth,
    height: frame.contentWindow.innerHeight,
  })
  if (detectedSize.width === pcPreviewSize.value.width && detectedSize.height === pcPreviewSize.value.height) return false
  pcDesignSizeDetected = true
  pcPreviewSize.value = detectedSize
  try {
    localStorage.setItem(PC_PREVIEW_SIZE_STORAGE_KEY, JSON.stringify(detectedSize))
  } catch {}
  resetPreviewRendering()
  return true
}

function schedulePcPreviewSizeDetection(pageId: string, frame: HTMLIFrameElement, attempt = 0) {
  if (pcDesignSizeDetected) return
  window.setTimeout(() => {
    if (previewFrames.get(pageId) !== frame || !frame.isConnected || applyDetectedPcPreviewSize(frame)) return
    if (attempt < 19) schedulePcPreviewSizeDetection(pageId, frame, attempt + 1)
  }, 250)
}

async function handlePreviewLoad(pageId: string, frame: HTMLIFrameElement) {
  try {
    loadedPreviewIds.value = new Set(loadedPreviewIds.value).add(pageId)
    syncPreviewHotspots(pageId)
    requestFocusedPageScan(pageId)
    if (!applyDetectedPcPreviewSize(frame)) schedulePcPreviewSizeDetection(pageId, frame)
    else return
    await waitForPreviewReady(frame, PREVIEW_READY_QUIET_MS)
    syncPreviewHotspots(pageId)
    readyPreviewIds.value = new Set(readyPreviewIds.value).add(pageId)
    requestFocusedPageScan(pageId)
    const page = pages.value.find(item => item.id === pageId)
    if (pageId === focusedPageId.value && !cachedPageDiagnostics(page)) requestFocusedDiagnostics()
    const title = frame.contentDocument?.title.trim()
    if (page && title && title !== page.title) await reportPageTitle(props.config, page.path, title)
    await capturePreview(pageId, frame, true)
  } catch {}
}

async function capturePreview(pageId: string, frame: HTMLIFrameElement, ready = false) {
  const page = pages.value.find(item => item.id === pageId)
  if (!page || thumbnailIsCurrent(page) || capturePreviewId.value !== pageId || capturesInProgress.has(pageId)) return
  try {
    const frameLocation = frame.contentWindow?.location
    if (!frameLocation || frameLocation.href === 'about:blank' || !frameLocation.search.includes('__unplugin-pageflow_preview=1')) return
  } catch {
    return
  }
  capturesInProgress.add(pageId)
  const generation = previewGeneration
  try {
    if (!ready) await waitForPreviewReady(frame, PREVIEW_READY_QUIET_MS)
    if (generation !== previewGeneration) return
    const body = frame.contentDocument?.body
    if (!body || !frame.isConnected) return
    const records = await capturePageThumbnails({
      config: props.config,
      document: frame.contentDocument!,
      body,
      pageId: thumbnailPageKey(page, pages.value),
      previewMode: previewMode.value,
      mode: currentPreviewMode.value,
      revision: pageThumbnailRevision(page),
      highResolution: pageId === focusedPageId.value || manualCaptureIds.has(pageId),
    })
    if (generation !== previewGeneration) return
    records.forEach(record => { pendingThumbnailRecords[record.slot] = record })
    captureRetryCounts.delete(pageId)
    const retryTimer = captureRetryTimers.get(pageId)
    if (retryTimer) window.clearTimeout(retryTimer)
    captureRetryTimers.delete(pageId)
    forcedThumbnailRefreshIds.delete(pageId)
  } catch (error) {
    forcedThumbnailRefreshIds.delete(pageId)
    failedPreviewIds.add(pageId)
    if (!manualCaptureIds.has(pageId)) {
      const retries = captureRetryCounts.get(pageId) ?? 0
      if (retries < 2) {
        captureRetryCounts.set(pageId, retries + 1)
        const timer = window.setTimeout(() => {
          captureRetryTimers.delete(pageId)
          failedPreviewIds.delete(pageId)
          captureBatchIds.delete(pageId)
          scheduleNextCapture()
        }, 5000)
        captureRetryTimers.set(pageId, timer)
      }
    }
    console.warn(`unplugin-pageflow could not cache ${page.path}`, error)
  } finally {
    capturesInProgress.delete(pageId)
    if (generation === previewGeneration) finishCapture(pageId)
  }
}

function resetPreviewRendering() {
  cancelScheduledCapture()
  previewGeneration++
  livePreviewId.value = undefined
  livePreviewCacheIds.value = []
  capturePreviewId.value = undefined
  captureBatchIds.clear()
  manualCaptureIds.clear()
  failedPreviewIds.clear()
  captureRetryTimers.forEach(timer => window.clearTimeout(timer))
  captureRetryTimers.clear()
  captureRetryCounts.clear()
  Object.keys(pendingThumbnailRecords).forEach(id => delete pendingThumbnailRecords[id])
  requestLayout(pages.value, true)
}

function setPreviewMode(mode: PageFlowPreviewMode) {
  if (previewMode.value === mode) return
  previewMode.value = mode
  try {
    localStorage.setItem(PREVIEW_MODE_STORAGE_KEY, mode)
  } catch {}
  resetPreviewRendering()
}

function handlePcViewportResize() {
  window.clearTimeout(pcViewportResizeTimer)
  pcViewportResizeTimer = window.setTimeout(() => {
    const nextCanvas = { width: canvas.value?.clientWidth ?? 0, height: canvas.value?.clientHeight ?? 0 }
    const layoutWidthChanged = nextCanvas.width !== canvasViewport.width
    if (props.host) {
      if (leafer && canvasViewport.width && canvasViewport.height) {
        const layer = leafer.zoomLayer
        layer.set({
          x: (layer.x ?? 0) + (nextCanvas.width - canvasViewport.width) / 2,
          y: (layer.y ?? 0) + (nextCanvas.height - canvasViewport.height) / 2,
        })
      }
      canvasViewport = nextCanvas
      if (layoutWidthChanged) requestLayout()
      else draw()
      return
    }
    if (layoutWidthChanged) requestLayout()
    if (pcDesignSizeDetected) return
    const next = { width: window.innerWidth, height: window.innerHeight }
    if (next.width === pcPreviewSize.value.width && next.height === pcPreviewSize.value.height) return
    pcPreviewSize.value = next
    if (previewMode.value === 'pc') resetPreviewRendering()
  }, 200)
}

function zoomCanvas(direction: 'in' | 'out') {
  leafer?.zoom(direction)
  requestAnimationFrame(() => syncOverlay())
}

function dispatchCanvasWheel(event: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>, clientX: number, clientY: number) {
  forwardWheelToCanvas(leafer?.interaction as PageFlowWheelInteraction | undefined, event, clientX, clientY)
}

function handleOverlayWheel(event: WheelEvent) {
  event.preventDefault()
  dispatchCanvasWheel(event, event.clientX, event.clientY)
}

function flyToPage(
  pageId: string,
  targetPosition = positions.value.get(pageId),
  midpoint?: () => void,
  targetScale?: number,
  finalTransform?: CanvasTransform,
) {
  if (!leafer || !canvas.value || !targetPosition) return
  flightAnimation.cancel()
  const layer = leafer.zoomLayer
  const viewport = { width: canvas.value.clientWidth, height: canvas.value.clientHeight }
  const start: CanvasTransform = {
    x: layer.x ?? 0,
    y: layer.y ?? 0,
    scaleX: layer.scaleX ?? 1,
    scaleY: layer.scaleY ?? 1,
  }
  let target = finalTransform ?? centerPageTransform(targetPosition, pageCardHeight(pageId), viewport, targetScale ?? start.scaleX)
  const startCenter = {
    x: (viewport.width / 2 - start.x) / start.scaleX,
    y: (viewport.height / 2 - start.y) / start.scaleY,
  }
  const targetCenter = {
    x: targetPosition[0] + PAGE_CARD_WIDTH / 2,
    y: targetPosition[1] + pageCardHeight(pageId) / 2,
  }
  const middleScale = Math.max(0.05, Math.min(start.scaleX, target.scaleX) * 0.55)
  const middle = {
    x: viewport.width / 2 - (startCenter.x + targetCenter.x) / 2 * middleScale,
    y: viewport.height / 2 - (startCenter.y + targetCenter.y) / 2 * middleScale,
    scaleX: middleScale,
    scaleY: middleScale,
  }
  let midpointApplied = false
  viewportInteracting.value = true
  const ease = (value: number) => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2
  const tween = (from: CanvasTransform, to: CanvasTransform, amount: number): CanvasTransform => ({
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    scaleX: from.scaleX + (to.scaleX - from.scaleX) * amount,
    scaleY: from.scaleY + (to.scaleY - from.scaleY) * amount,
  })
  flightAnimation.start(680, progress => {
    if (progress >= 0.5 && !midpointApplied) {
      midpointApplied = true
      midpoint?.()
      const currentPosition = positions.value.get(pageId)
      if (!finalTransform && currentPosition)
        target = focusedPageId.value === pageId
          ? fitFocusedPreviewTransform(currentPosition, pagePreviewHeight(pageId), viewport, SELECTED_PAGE_SCALE, 32, 16, currentPreviewMode.value.width)
          : centerPageTransform(currentPosition, pageCardHeight(pageId), viewport, targetScale ?? start.scaleX)
    }
    const transform = progress < 0.5
      ? tween(start, middle, ease(progress * 2))
      : tween(middle, target, ease((progress - 0.5) * 2))
    layer.set(transform)
    syncOverlay(false)
  }, () => {
    clearTimeout(viewportIdleTimer)
    viewportInteracting.value = false
    if (focusedPageId.value === pageId && !finalTransform) centerFocusedPage(pageId)
    syncOverlay(true)
  })
}

function handlePreviewMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return
  const sourcePageId = previewFrames.pageIdForSource(event.source)
  const message = decodePreviewMessage(event.data)
  if (!message) return
  if (message.type === 'api-result') {
    if (!sourcePageId || !isLocalBusinessApiResponse(message.result.url, window.location.origin, message.result.contentType)) return
    const current = apiResultsByPage.value[sourcePageId] ?? []
    apiResultsByPage.value = {
      ...apiResultsByPage.value,
      [sourcePageId]: mergeApiResult(current, message.result),
    }
    pageFlowHost.publish?.({ kind: 'request', request: message.result })
    return
  }
  if (message.type === 'page-reported') {
    if (sourcePageId && sourcePageId === focusedPageId.value) {
      requestAnimationFrame(() => requestFocusedPageScan(sourcePageId))
      const page = pages.value.find(item => item.id === sourcePageId)
      if (!cachedPageDiagnostics(page)) requestAnimationFrame(requestFocusedDiagnostics)
    }
    return
  }
  if (message.type === 'hotspot-hover') {
    if (sourcePageId !== focusedPageId.value) return
    setHoveredHotspot(message.targets.length && message.hotspot
      ? { targets: message.targets, ...message.hotspot }
      : undefined)
    return
  }
  if (message.type === 'scan-result') {
    if (!sourcePageId || sourcePageId !== focusedPageId.value || message.path !== pages.value.find(page => page.id === sourcePageId)?.path) return
    const nextLinks = message.links
    focusedLinksScannedPageId = sourcePageId
    syncPreviewHotspots(sourcePageId)
    const targetsChanged = focusTargetSetKey(focusedLinks.value) !== focusTargetSetKey(nextLinks)
    focusedLinks.value = nextLinks
    if (targetsChanged) void requestFocusedLayout()
    else scheduleCanvasRender()
    return
  }
  if (message.type === 'diagnostics-result') {
    if (sourcePageId !== focusedPageId.value || message.path !== pages.value.find(page => page.id === sourcePageId)?.path) return
    window.clearTimeout(diagnosticsTimer)
    diagnosticsInFlightPageId = undefined
    diagnosticsLoading.value = false
    const sourceDiagnostics = pages.value.find(page => page.id === sourcePageId)?.diagnostics ?? []
    focusedDiagnostics.value = [...sourceDiagnostics, ...message.diagnostics]
    pageFlowHost.publish?.({ kind: 'diagnostics', diagnostics: focusedDiagnostics.value })
    const page = pages.value.find(item => item.id === sourcePageId)
    if (page) diagnosticsByPage.set(page.id, { revision: page.revision ?? '', diagnostics: focusedDiagnostics.value })
    if (diagnosticsRefreshQueued) requestFocusedDiagnostics()
    return
  }
  const hotspotNavigation = message.hotspot
  if (!sourcePageId || sourcePageId !== focusedPageId.value || sourcePageId !== livePreviewId.value
    || (!hotspotNavigation && !readyPreviewIds.value.has(sourcePageId))) return
  const target = pages.value.find(page => page.path === message.to)
  if (!target) return
  if (message.location) {
    readyPreviewIds.value = new Set([...readyPreviewIds.value].filter(id => id !== target.id))
    navigationLocations.value = { ...navigationLocations.value, [target.path]: message.location }
    failedPreviewIds.delete(target.id)
  }
  activatePreview(target.id)
}

function createCardGroup(page: PageFlowPage, x: number, y: number, scale = 1, highlighted = false, compactOnly = false, hideMeta = false) {
  const compact = compactThumbnailRecord(page.id)
  return createPageCardGroup({
    page,
    x,
    y,
    scale,
    highlighted,
    hideMeta,
    previewHeight: pagePreviewHeight(page.id),
    tiles: compactOnly ? (compact ? [compact] : []) : pageThumbnailTiles(page),
    thumbnailSource,
    copied: copiedPath.value === page.path,
    dark: darkMode.value,
  })
}

function createDeckGroup(page: PageFlowPage, x: number, y: number) {
  const deck = routeDeckByPageId.value.get(page.id)!
  return createPageDeckGroup({
    x,
    y,
    previewHeight: pagePreviewHeight(page.id),
    label: groupDisplayName(deck.key, deck.label),
    count: deck.pages.length,
    layerPages: visibleDeckLayerPages(page.id),
    createLayer: (deckPage, layerX, layerY) => createCardGroup(deckPage, layerX, layerY, 1, false, true, true),
    dark: darkMode.value,
  })
}

function toggleColorMode() {
  darkMode.value = !darkMode.value
  document.documentElement.classList.toggle('dark', darkMode.value)
  localStorage.setItem('unplugin-pageflow:color-mode', darkMode.value ? 'dark' : 'light')
  cardNodes?.clear()
  scheduleCanvasRender()
}
function renderCanvasScene() {
  if (!leafer) return
  if (!edgeLayer || !cardLayer) {
    edgeLayer = new Group({ hittable: false })
    cardLayer = new Group({ hittable: true, hitChildren: true })
    cardNodes = new SceneNodeCache(cardLayer)
    leafer.add(cardLayer)
    leafer.add(edgeLayer)
  }
  if (!pages.value.length) {
    edgeLayer.removeAll(true)
    connectionNodes?.clear()
    cardNodes?.clear()
    if (canvas.value) {
      canvas.value.dataset.renderedPages = '0'
      canvas.value.dataset.renderedEdges = '0'
    }
    cardLayer.add(new Text({ x: 80, y: 90, text: 'Waiting for Vue Router…', fontSize: 20, fill: '#958d82' }))
    return
  }
  if (!cardNodes?.size && cardLayer.children?.length) cardLayer.removeAll(true)
  edgeLayer.removeAll(true)
  const focus = focusScene.value
  const focusTargets = new Map(focus?.targets.map(target => [target.page.id, target]) ?? [])
  const scenePagesById = new Map(canvasPages.value.filter(page => visiblePageIds.value.has(page.id)).map(page => [page.id, page]))
  Object.values(parkedPages.value).forEach(page => scenePagesById.set(page.id, page))
  if (focus) {
    scenePagesById.set(focus.source.id, focus.source)
    focus.targets.forEach(target => scenePagesById.set(target.page.id, target.page))
  }
  const scenePages = [...scenePagesById.values()]
  capturePulseGroup = undefined
  const focusAvoidanceBounds = focus ? (() => {
    const bounds = [
      { x: focus.sourcePosition[0], y: focus.sourcePosition[1], width: PAGE_CARD_WIDTH, height: pageCardHeight(focus.source.id) },
      ...focus.targets.map(target => ({ x: target.x, y: target.y, width: PAGE_CARD_WIDTH * target.scale, height: pageCardHeight(target.page.id) * target.scale })),
    ]
    const padding = 56
    return {
      left: Math.min(...bounds.map(item => item.x)) - padding,
      top: Math.min(...bounds.map(item => item.y)) - padding,
      right: Math.max(...bounds.map(item => item.x + item.width)) + padding,
      bottom: Math.max(...bounds.map(item => item.y + item.height)) + padding,
    }
  })() : undefined
  const avoidFocusGroup = (page: PageFlowPage, position: [number, number]): [number, number] => {
    if (!focus || !focusAvoidanceBounds || page.id === focus.source.id || focusTargets.has(page.id) || parkedPagePositions.value[page.id]) return position
    const width = PAGE_CARD_WIDTH
    const height = pageCardHeight(page.id)
    const overlaps = (x: number, y: number) => x < focusAvoidanceBounds.right && x + width > focusAvoidanceBounds.left
      && y < focusAvoidanceBounds.bottom && y + height > focusAvoidanceBounds.top
    const groupCenterX = (focusAvoidanceBounds.left + focusAvoidanceBounds.right) / 2
    const groupCenterY = (focusAvoidanceBounds.top + focusAvoidanceBounds.bottom) / 2
    const pageCenterX = position[0] + width / 2
    const pageCenterY = position[1] + height / 2
    const rawDistance = Math.hypot(pageCenterX - groupCenterX, pageCenterY - groupCenterY)
    const directionX = rawDistance ? (pageCenterX - groupCenterX) / rawDistance : 1
    const directionY = rawDistance ? (pageCenterY - groupCenterY) / rawDistance : 0
    for (let offset = 120; offset <= 1440; offset += 120) {
      const candidate: [number, number] = [position[0] + directionX * offset, position[1] + directionY * offset]
      if (!overlaps(candidate[0], candidate[1])) return candidate
    }
    return [position[0] + directionX * 1440, position[1] + directionY * 1440]
  }
  const scenePageIds = new Set(scenePages.map(page => page.id))
  cardNodes?.retain(scenePageIds)
  scenePages.forEach(page => {
    const basePosition = positions.value.get(page.id) ?? parkedPagePositions.value[page.id] ?? focus?.sourcePosition ?? [0, 0]
    const target = focusTargets.get(page.id)
    const destination = target ? [target.x, target.y] as [number, number] : avoidFocusGroup(page, basePosition)
    const destinationScale = target?.scale ?? 1
    const originScale = positions.value.has(page.id) || parkedPagePositions.value[page.id] ? 1 : 0.15
    const x = basePosition[0] + (destination[0] - basePosition[0]) * focusLayoutProgress
    const y = basePosition[1] + (destination[1] - basePosition[1]) * focusLayoutProgress
    const scale = originScale + (destinationScale - originScale) * focusLayoutProgress
    const previewH = pagePreviewHeight(page.id)
    const selectedScale = page.id === active.value ? SELECTED_PAGE_SCALE : 1
    const parkedProgress = parkedPageProgress.value[page.id] ?? 0
    const parkedScale = 1 - parkedProgress * 0.5
    const visualScale = scale * selectedScale * parkedScale
    const visualX = x - PAGE_CARD_WIDTH * (visualScale - scale) / 2
    const visualY = y - previewH * (visualScale - scale) / 2
    const dimmedByHotspot = Boolean(hoveredHotspot.value && target && !hoveredTargetPageIds.value.has(page.id))
    const opacity = (dimmedByHotspot ? 1 - hoverFadeProgress * 0.76 : 1) * (1 - parkedProgress * 0.8)
    const tiles = pageThumbnailTiles(page)
    const deck = routeDeckByPageId.value.get(page.id)
    const cardSignature = [
      previewH,
      page.title,
      page.path,
      page.id === active.value,
      copiedPath.value === page.path,
      deck?.pages.length ?? 0,
      deck ? groupDisplayName(deck.key, deck.label) : '',
      ...(visibleDeckLayerPages(page.id).map(deckPage => {
        const compact = compactThumbnailRecord(deckPage.id)
        return `${deckPage.id}:${deckPage.title}:${compact ? thumbnailSource(compact) ?? '' : ''}`
      }) ?? []),
      focusTargets.has(page.id),
      darkMode.value,
      ...tiles.map(record => `${record.slot}:${thumbnailSource(record) ?? ''}:${record.tileTop ?? 0}:${record.height}`),
    ].join('|')
    const group = cardNodes?.upsert(page.id, cardSignature, () => {
      const group = routeDeckByPageId.value.has(page.id) && !focusTargets.has(page.id)
        ? createDeckGroup(page, x, y)
        : createCardGroup(page, visualX, visualY, visualScale, page.id === active.value)
      if (target) group.set({ hittable: true, hitChildren: false, cursor: 'move' })
      group.opacity = opacity
      return group
    }, group => group.set({ x: visualX, y: visualY, scaleX: visualScale, scaleY: visualScale, opacity }))
    if (group && page.id === capturePreviewId.value && setPageCardShadow(group, page.id === active.value, 0)) {
      capturePulseGroup = group
      capturePulseHighlighted = page.id === active.value
    }
  })
  const visibleConnectionIds = new Set<string>()
  if (focus && focusLayoutProgress > 0.85) {
    connectionPaths.value.forEach(connection => {
      visibleConnectionIds.add(connection.id)
      const hover = hoveredHotspot.value
      const highlighted = !hover || (hoveredTargetPageIds.value.has(connection.targetId)
        && (connectionCountsByTarget.value.get(connection.targetId) === 1 || hover.centerX == null || hover.centerY == null
          || (Math.abs((connection.centerX ?? 0.5) - hover.centerX) < 0.002
            && Math.abs((connection.centerY ?? 0.5) - hover.centerY) < 0.002)))
      const opacity = hover && highlighted ? 0.5 + hoverFadeProgress * 0.5 : 0.5
      connectionNodes?.upsert(connection.id, connection.d, () => new Path({
          path: connection.d,
          stroke: '#ff79b8',
          strokeWidth: 2,
          strokeScaleFixed: true,
          endArrow: 'triangle',
          opacity,
          hittable: false,
        }), path => path.set({ path: connection.d, opacity }))
    })
  }
  connectionNodes?.retain(visibleConnectionIds)
  const visibleHotspotIds = new Set<string>()
  if (props.host && focus && focusLayoutProgress > 0.85) {
    const previewHeight = pagePreviewHeight(focus.source.id)
    const scale = focus.source.id === active.value ? SELECTED_PAGE_SCALE : 1
    const originX = focus.sourcePosition[0] - PAGE_CARD_WIDTH * (scale - 1) / 2
    const originY = focus.sourcePosition[1] - previewHeight * (scale - 1) / 2
    hostHotspotRects(focusedLinks.value, {
      x: originX,
      y: originY,
      width: PAGE_CARD_WIDTH,
      height: previewHeight,
      scale,
    }).forEach((hotspot) => {
      visibleHotspotIds.add(hotspot.id)
      const options = {
        x: hotspot.x,
        y: hotspot.y,
        width: hotspot.width,
        height: hotspot.height,
        fill: hotspot.fill,
        stroke: hotspot.stroke,
        strokeWidth: 1,
        strokeScaleFixed: true,
        hittable: false,
      }
      hotspotNodes?.upsert(hotspot.id, JSON.stringify(options), () => new Rect(options), rect => rect.set(options))
    })
  }
  hotspotNodes?.retain(visibleHotspotIds)
  if (canvas.value) {
    canvas.value.dataset.renderedPages = String(scenePages.length)
    canvas.value.dataset.renderedEdges = String(connectionPaths.value.length)
  }
}

function scheduleCanvasRender() {
  if (sceneRenderFrame) return
  sceneRenderFrame = requestAnimationFrame(() => {
    sceneRenderFrame = 0
    renderCanvasScene()
  })
}

function draw() {
  if (!canvas.value) return
  canvasViewport = { width: canvas.value.clientWidth, height: canvas.value.clientHeight }
  if (!leafer) {
    leafer = new Leafer({
      ...PAGEFLOW_CANVAS_CONFIG,
      view: canvas.value,
    })
    leafer.on(MoveEvent.MOVE, () => handleViewportTransform())
    leafer.on(ZoomEvent.ZOOM, () => handleViewportTransform())
    canvas.value.addEventListener('click', handleCanvasClick)
    canvas.value.addEventListener('pointerdown', handleFocusTargetPointerDown, true)
    canvas.value.addEventListener('pointermove', handleCanvasCursor, true)
    canvas.value.addEventListener('pointermove', handleFocusTargetHover)
    canvas.value.addEventListener('pointerleave', clearFocusTargetHover)
    window.addEventListener('pointermove', handleFocusTargetPointerMove, true)
    window.addEventListener('pointerup', handleFocusTargetPointerUp, true)
    window.addEventListener('pointercancel', handleFocusTargetPointerUp, true)
  }
  if (!connectionLeafer && connectionCanvas.value) {
    connectionLeafer = new Leafer({ ...PAGEFLOW_CANVAS_CONFIG, view: connectionCanvas.value })
    connectionCanvas.value.querySelectorAll('canvas').forEach(canvas => canvas.style.setProperty('pointer-events', 'none', 'important'))
    connectionLayer = new Group({ hittable: false })
    connectionPathLayer = new Group({ hittable: false })
    hotspotLayer = new Group({ hittable: false })
    connectionNodes = new SceneNodeCache(connectionPathLayer)
    hotspotNodes = new SceneNodeCache(hotspotLayer)
    connectionLayer.add(connectionPathLayer)
    connectionLayer.add(hotspotLayer)
    connectionLeafer.add(connectionLayer)
  }
  renderCanvasScene()
  requestAnimationFrame(() => syncOverlay())
}

function applyGraph(nextPages: PageFlowPage[], nextRouteMode: PageFlowRouteMode) {
  const previousPromotedPath = promotedRouteGroupPath(pages.value)
  const followsPromotedRoot = routeGroupPath.value.length === previousPromotedPath.length
    && routeGroupPath.value.every((segment, index) => segment === previousPromotedPath[index])
  const nextPromotedPath = promotedRouteGroupPath(nextPages)
  const plan = planGraphUpdate({
    pages: pages.value,
    nextPages,
    routeMode: routeMode.value,
    nextRouteMode,
    livePreviewId: livePreviewId.value,
    livePreviewCacheIds: livePreviewCacheIds.value,
    focusedPageId: focusedPageId.value,
    activeId: active.value,
  })
  routeMode.value = nextRouteMode
  livePreviewId.value = plan.livePreviewId
  livePreviewCacheIds.value = plan.livePreviewCacheIds
  if (plan.routeModeChanged) {
    focusedPageId.value = undefined
    focusedLinks.value = []
    focusedTargetPositions.value = {}
  }
  focusedPageStateCache.retain(plan.pageIds)
  if (plan.focusedPageRemoved) exitFocus()
  pages.value = nextPages
  if (followsPromotedRoot) routeGroupPath.value = nextPromotedPath
  active.value = plan.activeId
  status.value = plan.status
  if (nextPages.length) {
    routeDiscoveryFrame?.remove()
    routeDiscoveryFrame = undefined
  }
  if (plan.layoutChanged) requestLayout(nextPages)
  else scheduleCanvasRender()
  scheduleNextCapture()
}

function applyPageUpdate(nextPage: PageFlowPage) {
  const plan = planPageUpdate({
    pages: pages.value,
    nextPage,
    focusedPageId: focusedPageId.value,
    scannedPageId: focusedLinksScannedPageId,
    focusedLinks: focusedLinks.value,
  })
  if (!plan) return
  focusedLinks.value = plan.focusedLinks
  if (!plan.pageChanged) {
    if (plan.action === 'layout') void requestFocusedLayout()
    else if (plan.action === 'render') scheduleCanvasRender()
    return
  }
  pages.value = plan.pages
  if (plan.sourceChanged) {
    diagnosticsByPage.delete(nextPage.id)
    if (nextPage.id === focusedPageId.value) {
      focusedDiagnostics.value = nextPage.diagnostics ?? []
      requestFocusedDiagnostics()
    }
    showPageUpdateEffect(nextPage)
  }
  status.value = 'Routes synced'
  if (plan.action === 'layout') void requestFocusedLayout()
  else if (plan.action === 'render') scheduleCanvasRender()
}

function removePageUpdateEffects() {
  pageUpdateEffects.forEach(({ group, animation }) => {
    animation.dispose()
    leafer?.remove(group, true)
  })
  pageUpdateEffects.clear()
}

function showPageUpdateRay(page: PageFlowPage) {
  const position = positions.value.get(page.id)
  if (!leafer || !position) return
  const previous = pageUpdateEffects.get(page.id)
  previous?.animation.cancel()
  if (previous) leafer.remove(previous.group, true)

  const group = new Group({ hittable: false })
  const ray = new Path({
    stroke: '#3b82f6',
    strokeWidth: 3,
    strokeScaleFixed: true,
    strokeCap: 'round',
    shadow: { x: 0, y: 0, blur: 12, color: '#3b82f6cc' },
    hittable: false,
  })
  group.add(ray)
  leafer.add(group)
  const animation = new FrameAnimation(animationHost)
  pageUpdateEffects.set(page.id, { group, animation })
  const duration = 10_000
  animation.start(duration, (progress) => {
    const currentPosition = positions.value.get(page.id)
    if (!currentPosition) return
    const fadeEnvelope = (1 - progress) ** 1.35
    const inset = 4
    const width = PAGE_CARD_WIDTH + inset * 2
    const height = pagePreviewHeight(page.id) + inset * 2
    const perimeter = (width + height) * 2
    const pointAt = (distance: number) => {
      let offset = ((distance % perimeter) + perimeter) % perimeter
      if (offset <= width) return [currentPosition[0] - inset + offset, currentPosition[1] - inset] as const
      offset -= width
      if (offset <= height) return [currentPosition[0] + PAGE_CARD_WIDTH + inset, currentPosition[1] - inset + offset] as const
      offset -= height
      if (offset <= width) return [currentPosition[0] + PAGE_CARD_WIDTH + inset - offset, currentPosition[1] + pagePreviewHeight(page.id) + inset] as const
      offset -= width
      return [currentPosition[0] - inset, currentPosition[1] + pagePreviewHeight(page.id) + inset - offset] as const
    }
    const head = progress * 5 * perimeter
    const points = Array.from({ length: 15 }, (_, pointIndex) => pointAt(head - pointIndex * 5))
    const path = points.map(([x, y], pointIndex) => `${pointIndex ? 'L' : 'M'}${x} ${y}`).join(' ')
    ray.set({
      path,
      opacity: fadeEnvelope,
    })
  }, () => {
    if (pageUpdateEffects.get(page.id)?.group !== group) return
    leafer?.remove(group, true)
    pageUpdateEffects.delete(page.id)
  })
}

function showPageUpdateEffect(page: PageFlowPage) {
  const target = pageUpdateEffectTarget(pages.value, routeGroupPath.value, page.id)
  if (target) showPageUpdateRay(target.page)
}

watch(requiredThumbnailRecords, records => {
  if (!initialSceneReady.value) {
    clearTimeout(initialRevealTimer)
    initialResourcesSettled.value = false
  }
  const generation = ++thumbnailResourceGeneration
  const urls = [...new Set(records.map(record => thumbnailUrl(props.config, record)))]
  const cachedResources = new Map(urls.flatMap(url => {
    const source = thumbnailResourceCache.get(url)
    return source ? [[url, source] as const] : []
  }))
  thumbnailResources.value = Object.fromEntries(cachedResources)
  scheduleCanvasRender()
  void Promise.all(urls.map(async url => {
    try {
      const source = cachedResources.get(url) ?? await thumbnailResourceCache.load(url)
      if (generation === thumbnailResourceGeneration && thumbnailResources.value[url] !== source) {
        thumbnailResources.value = { ...thumbnailResources.value, [url]: source }
        scheduleCanvasRender()
      }
      return [url, source] as const
    } catch {
      return undefined
    }
  })).then(resources => {
    if (generation !== thumbnailResourceGeneration) return
    thumbnailResources.value = Object.fromEntries(resources.filter(resource => resource != null))
    thumbnailResourceCache.trim(new Set(urls))
    scheduleCanvasRender()
    initialResourcesSettled.value = true
    scheduleInitialSceneReveal()
  })
}, { immediate: true })

watch([active, copiedPath], scheduleCanvasRender)
watch(capturePreviewId, (pageId) => {
  cancelAnimationFrame(capturePulseFrame)
  capturePulseFrame = 0
  if (!pageId) {
    if (capturePulseGroup) setPageCardShadow(capturePulseGroup, capturePulseHighlighted)
    capturePulseGroup = undefined
    scheduleCanvasRender()
    return
  }
  const startedAt = performance.now()
  const tick = (time: number) => {
    if (!capturePreviewId.value || !capturePulseGroup) {
      capturePulseFrame = 0
      return
    }
    const pulse = (1 - Math.cos((time - startedAt) / 900 * Math.PI * 2)) / 2
    setPageCardShadow(capturePulseGroup, capturePulseHighlighted, pulse)
    capturePulseFrame = requestAnimationFrame(tick)
  }
  scheduleCanvasRender()
  requestAnimationFrame(() => {
    if (capturePulseGroup && capturePreviewId.value === pageId) capturePulseFrame = requestAnimationFrame(tick)
  })
})
watch([focusedPageId, focusedDiagnostics, focusedApiResults, focusedPageTests, focusedLinks, lighthouseReport], scheduleAIContextSync, { deep: true })
watch(focusedPageId, () => {
  editorOpenError.value = ''
  window.clearTimeout(diagnosticsRequestTimer)
  window.clearTimeout(diagnosticsTimer)
  diagnosticsInFlightPageId = undefined
  diagnosticsRefreshQueued = false
  const page = pages.value.find(item => item.id === focusedPageId.value)
  const cachedDiagnostics = cachedPageDiagnostics(page)
  focusedDiagnostics.value = cachedDiagnostics ?? []
  lighthouseReport.value = undefined
  lighthouseError.value = ''
  previewFrames.forEach((_frame, pageId) => syncPreviewHotspots(pageId))
  void refreshFocusedTests()
  if (!cachedDiagnostics) requestAnimationFrame(requestFocusedDiagnostics)
})

function applyHostState(state: PageFlowHostState) {
  const graph = hostStateToGraph(state, ACCENTS)
  hostPageUrls.clear()
  graph.pageUrls.forEach((url, id) => hostPageUrls.set(id, url))
  navigationLocations.value = graph.navigationLocations
  applyGraph(graph.pages, 'history')
  const currentPage = graph.pages.find(page => page.id === graph.currentPageId)
  if (currentPage) {
    active.value = currentPage.id
    apiResultsByPage.value = {
      ...apiResultsByPage.value,
      [currentPage.id]: graph.requests.map(request => ({ ...request, fields: [] })),
    }
  }
}

onMounted(async () => {
  pageTodos.value = await loadPageFlowTodos(pageFlowHost)
  if (!props.host) void fetchPageFlowEditor(props.config).then(value => { editorInfo.value = value }).catch(() => undefined)
  refreshSessionUsers()
  window.addEventListener('storage', handlePageFlowStorage)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('message', handlePreviewMessage)
  window.addEventListener('keydown', handleSearchShortcut)
  window.addEventListener('resize', handlePcViewportResize)
  layoutWorker = new LayoutWorker()
  layoutWorker.addEventListener('message', event => {
    if (event.data?.id !== layoutRequestId) return
    clearTimeout(layoutTimeout)
    if (!Array.isArray(event.data.positions)) {
      console.warn('unplugin-pageflow route layout failed', event.data?.error ?? 'Unknown layout worker error')
      layoutWorker?.terminate()
      layoutWorker = undefined
      status.value = pages.value.length ? 'Routes synced' : status.value
      return
    }
    const layoutPagesList = canvasPagesFor(pages.value)
    const nextPositions = restoreCanvasLayout(
      centerLayoutHorizontally(new Map<string, [number, number]>(event.data.positions), layoutPagesList),
      layoutPagesList,
    )
    status.value = pages.value.length ? 'Routes synced' : status.value
    const targetPosition = nextPositions.get(active.value)
    if (animateLayoutRequest && initialSceneReady.value && positions.value.has(active.value) && targetPosition) {
      flyToPage(active.value, targetPosition, () => {
        positions.value = nextPositions
        draw()
      })
    } else {
      positions.value = nextPositions
      draw()
    }
    initialLayoutSettled.value = true
    scheduleInitialSceneReveal()
  })
  layoutWorker.addEventListener('error', () => {
    clearTimeout(layoutTimeout)
    layoutWorker?.terminate()
    layoutWorker = undefined
    requestLayout()
  }, { once: true })
  positions.value = centerLayoutHorizontally(positions.value, canvasPages.value)
  draw()
  if (props.host) {
    thumbnailManifestLoaded.value = true
    try {
      const session = await startPageFlowHostSession(props.host, {
        onState: (state) => {
          applyHostState(state)
          void captureMissingHostThumbnails()
        },
        onRequest: (request) => {
          const pageId = focusedPageId.value ?? active.value
          const current = apiResultsByPage.value[pageId] ?? []
          apiResultsByPage.value = { ...apiResultsByPage.value, [pageId]: mergeApiResult(current, { ...request, fields: [] }) }
        },
        onDiagnostics: diagnostics => { focusedDiagnostics.value = diagnostics },
      })
      applyHostState(session.state)
      hostCanvasOrigin = session.origin
      hostCanvasStorage = session.storage
      canvasLayouts.value = {
        ...canvasLayouts.value,
        ...parseCanvasLayouts(hostCanvasStorage.canvasLayouts),
      }
      requestLayout()
      const storedGroupNames = hostCanvasStorage.groupNames
      if (storedGroupNames && typeof storedGroupNames === 'object' && !Array.isArray(storedGroupNames)) {
        groupNames.value = {
          ...groupNames.value,
          ...Object.fromEntries(Object.entries(storedGroupNames).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
        }
      }
      restoreHostThumbnails(hostCanvasStorage.thumbnails)
      const currentPage = pages.value.find(page => page.id === active.value)
      if (currentPage && !thumbnailIsCurrent(currentPage)) await captureHostThumbnail(currentPage)
      void captureMissingHostThumbnails()
      stopPageFlowUpdates = session.stop
    } catch {
      status.value = 'Failed to load PageFlow host'
      initialSceneReady.value = true
    }
    return
  }
  if (props.config.previewPath === '/') return

  try {
    thumbnailManifest.value = await fetchThumbnailManifest(props.config)
  } catch {
    thumbnailManifest.value = {}
  } finally {
    thumbnailManifestLoaded.value = true
    scheduleInitialSceneReveal()
    scheduleNextCapture()
  }

  stopPageFlowUpdates = subscribeToPageFlowUpdates(props.config, {
    graph: graph => applyGraph(graph.pages, graph.routeMode),
    page: applyPageUpdate,
    tests: () => void refreshFocusedTests(),
  })
  try {
    const graph = await fetchPageFlowGraph(props.config)
    applyGraph(graph.pages, graph.routeMode)
    if (!graph.pages.length) initialSceneReady.value = true
    if (!graph.pages.length) {
      routeDiscoveryFrame = startRouteDiscovery(props.config)
      setTimeout(async () => {
        if (pages.value.length) return
        const latest = await fetchPageFlowGraph(props.config)
        if (!latest.pages.length) status.value = 'Vue Router not detected'
      }, 5500)
    }
  } catch {
    status.value = 'Failed to load route graph'
    initialSceneReady.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('storage', handlePageFlowStorage)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.clearTimeout(aiContextTimer)
  window.clearTimeout(diagnosticsRequestTimer)
  removePageUpdateEffects()
  window.removeEventListener('message', handlePreviewMessage)
  window.removeEventListener('keydown', handleSearchShortcut)
  window.removeEventListener('resize', handlePcViewportResize)
  window.clearTimeout(pcViewportResizeTimer)
  canvas.value?.removeEventListener('click', handleCanvasClick)
  canvas.value?.removeEventListener('pointerdown', handleFocusTargetPointerDown, true)
  canvas.value?.removeEventListener('pointermove', handleCanvasCursor, true)
  canvas.value?.removeEventListener('pointermove', handleFocusTargetHover)
  canvas.value?.removeEventListener('pointerleave', clearFocusTargetHover)
  window.removeEventListener('pointermove', handleFocusTargetPointerMove, true)
  window.removeEventListener('pointerup', handleFocusTargetPointerUp, true)
  window.removeEventListener('pointercancel', handleFocusTargetPointerUp, true)
  cancelAnimationFrame(viewportFrame)
  cancelAnimationFrame(sceneRenderFrame)
  cancelAnimationFrame(capturePulseFrame)
  hoverAnimation.dispose()
  flightAnimation.dispose()
  focusAnimation.dispose()
  clearTimeout(viewportIdleTimer)
  cancelScheduledCapture()
  clearTimeout(copiedPathTimer)
  clearTimeout(layoutTimeout)
  clearTimeout(initialRevealTimer)
  captureRetryTimers.forEach(timer => window.clearTimeout(timer))
  clearTimeout(diagnosticsTimer)
  thumbnailResourceGeneration++
  thumbnailResourceCache.dispose()
  previewFrames.dispose()
  captureQueue.dispose()
  routeDiscoveryFrame?.remove()
  stopPageFlowUpdates?.()
  layoutWorker?.terminate()
  leafer?.destroy()
  connectionLeafer?.destroy()
  edgeLayer = undefined
  connectionLayer = undefined
  connectionNodes?.clear()
  hotspotNodes?.clear()
  connectionPathLayer = undefined
  hotspotLayer = undefined
  cardLayer = undefined
  cardNodes?.clear()
})
</script>

<template>
  <main @dragstart.prevent>
    <UHeader
      :toggle="false"
      :ui="{
        container: 'h-full max-w-none px-[18px]',
        center: 'flex-1 gap-6',
        right: 'gap-6',
      }"
    >
      <template #left>
        <div class="brand"><span>✦</span> unplugin-pageflow</div>
      </template>
      <div ref="searchRoot" class="quick-search">
        <UInputMenu
          v-model:open="searchOpen"
          v-model="searchSelection"
          :items="pages"
          value-key="id"
          label-key="title"
          description-key="path"
          :filter-fields="['title', 'path']"
          icon="i-lucide-search"
          placeholder="搜索页面…"
          open-on-focus
          open-on-click
          @update:model-value="selectSearchPage"
        >
          <template #trailing><kbd>⌘K</kbd></template>
          <template #empty>没有匹配页面</template>
        </UInputMenu>
      </div>
      <template #right>
        <div class="viewport-switch-layout">
          <UTabs
            :model-value="previewMode"
            :items="viewportTabs"
            :content="false"
            aria-label="Preview viewport"
            @update:model-value="value => value && setPreviewMode(value as PageFlowPreviewMode)"
          >
          </UTabs>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          :icon="darkMode ? 'i-lucide-sun' : 'i-lucide-moon'"
          :aria-label="darkMode ? '切换到浅色模式' : '切换到暗黑模式'"
          @click="toggleColorMode"
        />
        <div class="user-menu">
          <UDropdownMenu :items="headerUserMenuItems" :content="{ align: 'end', sideOffset: 7 }">
            <button type="button" :title="activeUser" :aria-label="`当前用户：${activeUser}`">
              <UAvatar :alt="activeUser" size="sm" />
            </button>
            <template #item-leading="{ item }">
              <span>{{ menuItemUser(item)?.slice(0, 1).toUpperCase() }}</span>
            </template>
            <template #item-trailing="{ item }">
              <button v-if="menuItemUser(item)" type="button" :aria-label="`编辑 ${menuItemUser(item)} 的备注`" :title="userNotes[menuItemUser(item)!] || '添加备注'" @click.stop.prevent="editUserNote(menuItemUser(item)!)">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M10.8 2.2a1.4 1.4 0 0 1 2 2L5.2 11.8 2.5 12.5l.7-2.7z" />
                  <path d="m9.8 3.2 2 2" />
                </svg>
              </button>
            </template>
          </UDropdownMenu>
        </div>
      </template>
    </UHeader>
    <section class="workspace" :class="{ 'scene-ready': initialSceneReady }">
      <div ref="canvas" class="canvas"></div>
      <div class="preview-overlay" @wheel="handleOverlayWheel">
        <div ref="overlayWorld" class="preview-world">
          <div
            v-for="page in previewPages"
            :key="page.id"
            class="page-preview"
            :style="{
              left: `${pagePosition(page.id)[0] + PAGE_PREVIEW_INSET}px`,
              top: `${pagePosition(page.id)[1] + PAGE_PREVIEW_INSET}px`,
              height: `${pagePreviewHeight(page.id)}px`,
              transform: page.id === active ? `scale(${SELECTED_PAGE_SCALE})` : undefined,
              transformOrigin: 'center center',
              pointerEvents: livePreviewId === page.id && loadedPreviewIds.has(page.id) && !viewportInteracting ? 'auto' : 'none',
            }"
            :data-page-id="page.id"
          >
            <UDropdownMenu
              v-if="users.length > 1 && page.id === focusedPageId"
              :items="pageUserMenuItems(page.id)"
              :content="{ align: 'end', sideOffset: 4 }"
            >
              <button type="button" aria-label="切换当前页面用户">
                <span>{{ userNotes[pageUsers[page.id] ?? activeUser ?? ''] || pageUsers[page.id] || activeUser }}</span>
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
              </button>
            </UDropdownMenu>
            <iframe
              :ref="element => setPreviewFrame(page.id, element as Element | null)"
              :key="`${previewMode}:${currentPreviewMode.width}x${currentPreviewMode.height}:${page.id}:${pageUsers[page.id] ?? activeUser}`"
              :src="previewUrl(page.path)"
              :title="`${page.title} preview`"
              :style="{
                position: 'absolute',
                inset: 0,
                width: `${currentPreviewMode.width}px`,
                height: `${currentPreviewMode.height}px`,
                 transform: `scale(${PAGE_CARD_WIDTH / currentPreviewMode.width})`,
                 visibility: livePreviewId === page.id && loadedPreviewIds.has(page.id) && !viewportInteracting ? 'visible' : 'hidden',
                 opacity: livePreviewId === page.id && loadedPreviewIds.has(page.id) && !viewportInteracting ? 1 : 0,
                pointerEvents: livePreviewId === page.id && loadedPreviewIds.has(page.id) && !viewportInteracting ? 'auto' : 'none',
              }"
              tabindex="-1"
              @load="handlePreviewLoad(page.id, $event.currentTarget as HTMLIFrameElement)"
            ></iframe>
          </div>
        </div>
      </div>
      <div ref="connectionCanvas" class="connection-canvas"></div>
      <iframe
        v-if="thumbnailManifestLoaded && props.config.previewPath !== '/'"
        ref="captureFrameElement"
        class="capture-preview-frame"
        :src="captureOnlyPage ? previewUrl(captureOnlyPage.path) : 'about:blank'"
        title="Capture preview"
        :style="{ width: `${currentPreviewMode.width}px`, height: `${currentPreviewMode.height}px` }"
        aria-hidden="true"
        tabindex="-1"
        @load="handleCaptureFrameLoad($event.currentTarget as HTMLIFrameElement)"
      ></iframe>
      <aside v-if="focusedPageId" class="api-panel" :class="{ 'is-collapsed': panelCollapsed }">
      <button
        type="button"
        class="api-panel-toggle"
        :aria-label="panelCollapsed ? '展开右侧面板' : '收起右侧面板'"
        :title="panelCollapsed ? '展开右侧面板' : '收起右侧面板'"
        @click="panelCollapsed = !panelCollapsed"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path :d="panelCollapsed ? 'm10 3-5 5 5 5' : 'm6 3 5 5-5 5'" />
        </svg>
      </button>
      <div v-show="!panelCollapsed" class="api-panel-content">
      <UTabs v-model="panelTab" class="api-panel-tabs" :items="panelTabs" variant="link" aria-label="页面详情">
        <template #api>
          <div v-if="focusedApiResults.length" class="api-panel-list">
            <div v-if="focusedApiIssues.length" class="border-b border-default py-3">
              <div class="text-sm font-medium text-highlighted">接口检查</div>
              <div class="mt-2 divide-y divide-default">
                <div
                  v-for="issue in focusedApiIssues"
                  :key="issue.resultId"
                  class="cursor-pointer py-2"
                  role="button"
                  tabindex="0"
                  @click="toggleApiIssueResult(issue.resultId)"
                  @keydown.enter="toggleApiIssueResult(issue.resultId)"
                  @keydown.space.prevent="toggleApiIssueResult(issue.resultId)"
                >
                  <div class="flex items-center gap-2">
                    <div class="min-w-0 flex-1 truncate text-sm text-highlighted">{{ apiIssueLabel(issue) }}</div>
                    <UBadge :label="issue.status === 'failed' ? '失败' : '警告'" :color="apiIssueColor(issue.status)" variant="soft" size="sm" />
                  </div>
                  <div class="mt-1 text-xs leading-5 text-muted">{{ issue.descriptions.join(' · ') }}</div>
                  <div v-if="openApiIssueResultId === issue.resultId" class="mt-2 border-t border-default pt-2" @click.stop>
                    <ApiFieldTree v-if="apiFieldTreeByResultId(issue.resultId).length" :nodes="apiFieldTreeByResultId(issue.resultId)" />
                    <div v-else class="api-empty">页面暂未展示返回字段</div>
                    <UButton
                      v-if="unusedApiFieldCount(issue.resultId)"
                      color="neutral"
                      variant="link"
                      size="xs"
                      :trailing-icon="expandedApiResults.has(issue.resultId) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                      @click="toggleApiResult(issue.resultId)"
                    >
                      {{ expandedApiResults.has(issue.resultId) ? '隐藏未使用字段' : `显示未使用字段（${unusedApiFieldCount(issue.resultId)}）` }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
            <UAccordion v-model="openApiResultId" :items="apiAccordionItems">
              <template #leading="{ item: result }">
                <UBadge :label="result.method" :color="apiMethodColor(result.method)" variant="soft" size="sm" />
              </template>
              <template #default="{ item: result }">
                <span class="min-w-0">
                  <span class="flex min-w-0 items-center gap-1.5">
                    <span class="min-w-0 flex-1 truncate">{{ result.label }}</span>
                    <UBadge v-if="(result.occurrences ?? 1) > 1" :label="`×${result.occurrences}`" color="warning" variant="soft" size="sm" />
                  </span>
                  <span class="block text-xs text-muted">
                    {{ result.status }} · {{ result.duration }}ms<span v-if="result.lastIntervalMs != null"> · 最近间隔 {{ result.lastIntervalMs }}ms</span>
                  </span>
                </span>
              </template>
              <template #body="{ item: result }">
                <div>
                  <div v-if="visibleApiFields(result).length" class="api-fields">
                    <ApiFieldTree :nodes="visibleApiFieldTree(result)" />
                  </div>
                  <div v-else class="api-empty">页面暂未展示返回字段</div>
                  <UButton
                    v-if="result.fields.some(field => !field.used)"
                    color="neutral"
                    variant="link"
                    size="xs"
                    :trailing-icon="expandedApiResults.has(result.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    @click="toggleApiResult(result.id)"
                  >
                    {{ expandedApiResults.has(result.id) ? '隐藏未使用字段' : `显示未使用字段（${result.fields.filter(field => !field.used).length}）` }}
                  </UButton>
                </div>
              </template>
            </UAccordion>
          </div>
          <div v-else class="api-panel-waiting">等待页面接口响应…</div>
        </template>
        <template #tests>
          <div class="api-panel-list">
            <div class="border-b border-default py-3">
              <div class="text-sm font-medium text-highlighted">页面检查</div>
              <div class="mt-2 divide-y divide-default">
                <div
                  v-for="check in focusedPageChecks"
                  :key="check.id"
                  class="cursor-pointer py-2"
                  role="button"
                  tabindex="0"
                  @click="locateFocusedPage"
                  @keydown.enter="locateFocusedPage"
                  @keydown.space.prevent="locateFocusedPage"
                >
                  <div class="flex items-center gap-2">
                    <div class="min-w-0 flex-1 text-sm text-highlighted">{{ check.title }}</div>
                    <UBadge :label="pageCheckStatusLabels[check.status]" :color="pageCheckColor(check.status)" variant="soft" size="sm" />
                  </div>
                  <div class="mt-1 text-xs leading-5 text-muted">{{ check.description }}</div>
                </div>
              </div>
            </div>
            <div v-if="focusedTestsLoading" class="api-panel-waiting">正在整理页面测试…</div>
            <div v-else-if="focusedTestsFailed" class="api-panel-waiting">页面测试加载失败</div>
            <div v-else-if="focusedPageTests.length">
            <div class="sticky top-0 z-10 flex items-center gap-2 border-b border-default bg-default py-2">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-highlighted">页面测试</div>
                <div class="mt-0.5 text-xs text-muted">
                  {{ focusedPageTests.length }} 项 · {{ focusedTestSummary.passed }} 通过 · {{ focusedTestSummary.failed }} 失败 · {{ focusedTestSummary.unknown }} 未运行
                </div>
              </div>
              <UButton
                v-if="runnableFocusedTests.length"
                class="shrink-0"
                :color="runningAllPageTests ? 'error' : 'primary'"
                :variant="runningAllPageTests ? 'soft' : 'outline'"
                size="xs"
                :icon="runningAllPageTests ? 'i-lucide-square' : 'i-lucide-play'"
                @click="runningAllPageTests ? stopAllFocusedPageTests() : runAllFocusedPageTests()"
              >
                {{ runningAllPageTests ? '停止' : `运行全部 ${runnableFocusedTests.length}` }}
              </UButton>
            </div>
            <div class="divide-y divide-default">
              <div v-for="test in focusedPageTests" :key="test.id" class="py-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <div class="min-w-0 flex-1 break-words text-sm font-medium leading-5 text-highlighted" :title="`${test.file}${test.line ? `:${test.line}` : ''}`">
                      {{ test.name }}
                    </div>
                    <UButton
                      class="shrink-0"
                      :color="runningPageTestIds.has(test.id) ? 'error' : 'neutral'"
                      :variant="runningPageTestIds.has(test.id) ? 'soft' : 'ghost'"
                      size="sm"
                      :icon="runningPageTestIds.has(test.id) ? 'i-lucide-square' : 'i-lucide-play'"
                      :aria-label="runningPageTestIds.has(test.id) ? `取消 ${test.name}` : `运行 ${test.name}`"
                      :title="test.runnable ? undefined : `未配置 ${testKindLabels[test.kind]} 测试命令`"
                      :disabled="!test.runnable || (runningAllPageTests && !runningPageTestIds.has(test.id))"
                      @click="runningPageTestIds.has(test.id) ? cancelFocusedPageTest(test) : runFocusedPageTest(test)"
                    />
                  </div>
                  <UCollapsible v-if="test.output">
                    <UButton
                      class="mt-1 p-0"
                      :color="test.status === 'passed' ? 'success' : test.status === 'failed' ? 'error' : 'neutral'"
                      variant="link"
                      size="xs"
                      trailing-icon="i-lucide-chevron-down"
                    >
                      {{ testStatusLabel(test) }}
                    </UButton>
                    <template #content>
                      <pre class="page-test-output">{{ cleanTestOutput(test.output) }}</pre>
                    </template>
                  </UCollapsible>
                  <div
                    v-else-if="test.status !== 'unknown'"
                    class="mt-1 text-xs"
                    :class="test.status === 'passed' ? 'text-success' : test.status === 'failed' ? 'text-error' : 'text-muted'"
                  >
                    {{ testStatusLabel(test) }}
                  </div>
                </div>
              </div>
            </div>
            </div>
            <div v-else class="api-panel-waiting">暂未发现属于此页面的测试</div>
          </div>
        </template>
        <template #diagnostics>
          <div class="api-panel-list">
            <div class="sticky top-0 z-10 border-b border-default bg-default py-2">
              <div class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-highlighted">页面诊断</div>
                  <div class="mt-0.5 text-xs text-muted">
                    {{ diagnosticSummary.error }} 错误 · {{ diagnosticSummary.warning }} 警告 · {{ diagnosticSummary.suggestion }} 建议
                  </div>
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-sparkles"
                  aria-label="复制 AI 修复提示词"
                  title="复制页面上下文和 AI 修复提示词"
                  @click="copyFocusedAIRepairPrompt"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-refresh-cw"
                  aria-label="重新扫描页面"
                  :loading="diagnosticsLoading"
                  @click="requestFocusedDiagnostics"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-download"
                  aria-label="导出诊断报告"
                  :disabled="!focusedDiagnostics.length && !lighthouseReport"
                  @click="exportFocusedDiagnostics"
                />
              </div>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <UButton
                  v-for="option in diagnosticSeverityOptions"
                  :key="option.value"
                  :color="diagnosticSeverity === option.value ? 'primary' : 'neutral'"
                  :variant="diagnosticSeverity === option.value ? 'soft' : 'ghost'"
                  size="xs"
                  @click="diagnosticSeverity = option.value"
                >
                  {{ option.label }}
                </UButton>
              </div>
            </div>
            <div class="border-b border-default py-3">
              <div class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-highlighted">Lighthouse</div>
                  <div class="mt-0.5 text-xs text-muted">性能、无障碍、最佳实践与 SEO</div>
                </div>
                <UButton
                  color="neutral"
                  variant="outline"
                  size="xs"
                  icon="i-lucide-gauge"
                  :loading="lighthouseLoading"
                  @click="runFocusedLighthouse"
                >
                  {{ lighthouseReport ? '重新审计' : '运行审计' }}
                </UButton>
              </div>
              <p v-if="lighthouseError" class="mt-2 text-xs text-error">{{ lighthouseError }}</p>
              <template v-if="lighthouseReport">
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <div v-for="(score, category) in lighthouseReport.scores" :key="category" class="flex items-center justify-between gap-2">
                    <span class="text-xs text-muted">{{ lighthouseCategoryLabels[category] }}</span>
                    <UBadge :label="score == null ? '—' : String(score)" :color="lighthouseScoreColor(score)" variant="soft" size="sm" />
                  </div>
                </div>
                <UCollapsible v-if="lighthouseReport.issues.length" class="mt-2">
                  <UButton color="neutral" variant="link" size="xs" trailing-icon="i-lucide-chevron-down" class="p-0">
                    {{ lighthouseReport.issues.length }} 项待改进
                  </UButton>
                  <template #content>
                    <div class="mt-1 divide-y divide-default">
                      <div v-for="issue in lighthouseReport.issues" :key="issue.id" class="py-2">
                        <div class="text-xs font-medium text-highlighted">{{ issue.title }}</div>
                        <div v-if="issue.displayValue" class="mt-0.5 text-xs text-warning">{{ issue.displayValue }}</div>
                        <div class="mt-1 text-xs leading-5 text-muted">{{ issue.description }}</div>
                        <a v-if="issue.helpUrl" class="mt-1 inline-flex text-xs text-primary hover:underline" :href="issue.helpUrl" target="_blank" rel="noreferrer">查看修复说明</a>
                      </div>
                    </div>
                  </template>
                </UCollapsible>
              </template>
            </div>
            <div v-if="diagnosticsLoading && !focusedDiagnostics.length" class="api-panel-waiting">正在扫描当前页面…</div>
            <UAccordion v-else-if="filteredFocusedDiagnosticGroups.length" :items="filteredFocusedDiagnosticGroups">
              <template #leading="{ item: group }">
                <UBadge :label="diagnosticSeverityLabels[group.severity]" :color="diagnosticColor(group.severity)" variant="soft" size="sm" />
              </template>
              <template #default="{ item: group }">
                <span class="flex min-w-0 items-center gap-2">
                  <span class="min-w-0 truncate">{{ group.label }}</span>
                  <UBadge v-if="group.items.length > 1" :label="String(group.items.length)" color="neutral" variant="soft" size="sm" />
                </span>
              </template>
              <template #body="{ item: group }">
                <div>
                  <p class="text-xs leading-5 text-muted">{{ group.description }}</p>
                  <div v-if="group.items.some(item => item.selector || diagnosticMeasurement(item))" class="mt-2 divide-y divide-default">
                    <div
                      v-for="(item, index) in group.items"
                      :key="item.id"
                      class="py-2"
                      :class="item.selector ? 'cursor-pointer' : undefined"
                      :role="item.selector ? 'button' : undefined"
                      :tabindex="item.selector ? 0 : undefined"
                      @click="item.selector && highlightDiagnostic(item)"
                      @keydown.enter="item.selector && highlightDiagnostic(item)"
                      @keydown.space.prevent="item.selector && highlightDiagnostic(item)"
                    >
                      <div
                        v-if="focusedDiagnosticEvidence.get(item.id)"
                        class="relative mb-2 overflow-hidden rounded-lg border border-default bg-muted"
                        :style="{
                          width: `${focusedDiagnosticEvidence.get(item.id)!.width}px`,
                          height: `${focusedDiagnosticEvidence.get(item.id)!.height}px`,
                        }"
                        aria-hidden="true"
                      >
                        <img
                          v-for="layer in focusedDiagnosticEvidence.get(item.id)!.layers"
                          :key="`${layer.source}:${layer.top}`"
                          :src="layer.source"
                          class="pointer-events-none absolute max-w-none"
                          :style="{ left: `${layer.left}px`, top: `${layer.top}px`, width: `${layer.width}px`, height: `${layer.height}px` }"
                        />
                        <span
                          class="pointer-events-none absolute rounded-sm border-2 border-error bg-error/10 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
                          :style="{
                            left: `${focusedDiagnosticEvidence.get(item.id)!.marker.left}px`,
                            top: `${focusedDiagnosticEvidence.get(item.id)!.marker.top}px`,
                            width: `${focusedDiagnosticEvidence.get(item.id)!.marker.width}px`,
                            height: `${focusedDiagnosticEvidence.get(item.id)!.marker.height}px`,
                          }"
                        />
                      </div>
                      <div class="min-w-0">
                        <div class="text-xs text-muted">{{ item.targetLabel || `问题 ${index + 1}` }}</div>
                        <div v-if="diagnosticMeasurement(item)" class="mt-0.5 text-xs text-dimmed">{{ diagnosticMeasurement(item) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </UAccordion>
            <div v-else class="api-panel-waiting">未发现当前规则覆盖的问题</div>
          </div>
        </template>
        <template #todos>
          <div class="todo-panel">
            <form class="todo-entry" @submit.prevent="addPageTodo">
              <input v-model="newTodoText" type="text" maxlength="240" placeholder="添加当前页面待办…" aria-label="添加当前页面待办">
              <UButton type="submit" size="sm" color="neutral" :disabled="!newTodoText.trim()">添加</UButton>
            </form>
            <div v-if="focusedTodos.length" class="todo-list">
              <div v-for="todo in focusedTodos" :key="todo.id" class="todo-item">
                <input :id="`todo-${todo.id}`" type="checkbox" :checked="todo.done" @change="togglePageTodo(todo.id)">
                <label :for="`todo-${todo.id}`" :class="{ done: todo.done }">{{ todo.text }}</label>
                <button type="button" aria-label="删除待办" title="删除待办" @click="removePageTodo(todo.id)">×</button>
              </div>
            </div>
            <div v-else class="api-panel-waiting">当前页面暂无待办</div>
          </div>
        </template>
      </UTabs>
      <footer class="api-panel-statusbar">
        <span class="inline-flex" :title="editorButtonHint">
          <UButton
            :icon="editorIcon"
            :color="editorOpenError ? 'error' : 'neutral'"
            variant="ghost"
            size="xs"
            :loading="editorOpening"
            :disabled="!focusedEditorPage?.sourceFile"
            :aria-label="editorButtonHint"
            @click="openFocusedPageInEditor"
          />
        </span>
      </footer>
      </div>
      </aside>
    </section>
    <div class="zoom"><button type="button" @click="zoomCanvas('in')">+</button><span>{{ zoomPercent }}%</span><button type="button" @click="zoomCanvas('out')">−</button></div>
    <footer><span><i></i> {{ status }}</span><span>{{ routeDeckView.decks.length }} 组 / {{ pages.length }} 页</span></footer>
  </main>
</template>
