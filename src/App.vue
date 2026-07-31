<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Leafer, Text, Group, MoveEvent, Path, ZoomEvent } from 'leafer-ui'
import '@leafer-in/view'
import '@leafer-in/viewport'
import type {
  PageFlowLink,
  PageFlowPage,
  PageFlowApiResult,
  PageFlowRouteMode,
  PageFlowThumbnailManifest,
  PageFlowThumbnailRecord,
  ResolvedPageFlowOptions,
} from './shared/types'
import { fetchPageFlowGraph, reportPageTitle, startRouteDiscovery, subscribeToPageFlowUpdates } from './client/graph'
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
import { createFocusScene } from './client/focus-layout'
import { createPageCardGroup, createPageDeckGroup } from './client/scene-cards'
import { SceneNodeCache } from './client/scene-node-cache'
import { FrameAnimation } from './client/frame-animation'
import { PreviewFrameRegistry } from './client/preview-frame-registry'
import { decodePreviewMessage } from './client/preview-message'
import { focusTargetSetKey, planPageUpdate } from './client/page-update'
import {
  fetchThumbnailManifest,
  fullThumbnailTiles,
  thumbnailRevision,
  thumbnailSlot,
  thumbnailTierForZoom,
  thumbnailUrl,
  visibleThumbnailTiles,
  type PageFlowPreviewMode,
  type PageFlowThumbnailTier,
} from './client/thumbnails'
import {
  centerPageTransform,
  createPageSpatialIndex,
  createRouteDeckView,
  getRenderablePages,
  getVisiblePageIds,
  layoutPageGrid,
  routeDeckPathForPage,
  PAGE_CARD_META_HEIGHT,
  PAGE_CARD_WIDTH,
  PAGEFLOW_AUTO_PREVIEW_SCALE,
  PAGE_PREVIEW_INSET,
  type CanvasTransform,
} from './client/layout'

const props = defineProps<{ config: ResolvedPageFlowOptions }>()

const previewModes = {
  mobile: { label: '手机', width: 393, height: 852 },
  tablet: { label: '平板', width: 768, height: 1024 },
  pc: { label: 'PC', width: 1440, height: 900 },
} as const
const PREVIEW_MODE_STORAGE_KEY = 'unplugin-pageflow:preview-mode'

function storedPreviewMode(): PageFlowPreviewMode {
  try {
    const mode = localStorage.getItem(PREVIEW_MODE_STORAGE_KEY)
    return mode && mode in previewModes ? mode as PageFlowPreviewMode : 'mobile'
  } catch {
    return 'mobile'
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
const zoomPercent = ref(90)
const visiblePageIds = ref(new Set<string>())
const viewportInteracting = ref(false)
const thumbnailManifest = ref<PageFlowThumbnailManifest>({})
const thumbnailManifestLoaded = ref(props.config.previewPath === '/')
const initialSceneReady = ref(props.config.previewPath === '/')
const initialLayoutSettled = ref(props.config.previewPath === '/')
const initialResourcesSettled = ref(props.config.previewPath === '/')
const previewMode = ref<PageFlowPreviewMode>(storedPreviewMode())
const thumbnailTier = ref<PageFlowThumbnailTier>('full')
const thumbnailResources = ref<Record<string, string>>({})
const navigationLocations = ref<Record<string, string>>({})
const settledTransform = ref<CanvasTransform>({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
const livePreviewId = ref<string>()
const focusedPageId = ref<string>()
const focusedLinks = ref<PageFlowLink[]>([])
const apiResultsByPage = ref<Record<string, PageFlowApiResult[]>>({})
const expandedApiResults = ref(new Set<string>())
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
const canvas = ref<HTMLDivElement>()
const connectionCanvas = ref<HTMLDivElement>()
const overlayWorld = ref<HTMLDivElement>()
let leafer: Leafer | undefined
let connectionLeafer: Leafer | undefined
let edgeLayer: Group | undefined
let connectionLayer: Group | undefined
let cardLayer: Group | undefined
let cardNodes: SceneNodeCache<Group> | undefined
let connectionNodes: SceneNodeCache<Path> | undefined
let viewportFrame = 0
let focusLayoutProgress = 0
let viewportIdleTimer: ReturnType<typeof setTimeout> | undefined
let backgroundCaptureStarted = false
let backgroundCaptureNotBefore = 0
const BACKGROUND_CAPTURE_INITIAL_DELAY = 3000
const BACKGROUND_CAPTURE_INTERVAL = 2500
const BACKGROUND_CAPTURE_INTERACTION_DELAY = 3000
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
const previewChangeVersions = new Map<string, number>()
const capturesInProgress = new Set<string>()
const focusedPageStateCache = new FocusedPageStateCache()
let focusedLinksScannedPageId: string | undefined
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
let previewGeneration = 0
const MAX_MOUNTED_PREVIEWS = 96
const MAX_DECK_LAYERS = 5
const PARKED_PAGE_GAP = 180
const SELECTED_PAGE_SCALE = 1.03
const thumbnailResourceCache = new ThumbnailResourceCache(160)
const captureQueue = new CaptureQueue({
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: timer => window.clearTimeout(timer),
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
let sceneRenderFrame = 0
let hoverFadeProgress = 0
const currentPreviewMode = computed(() => previewModes[previewMode.value])
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
const positions = ref(layoutPageGrid(canvasPages.value, cardHeights.value))
const spatialIndex = computed(() => createPageSpatialIndex(canvasPages.value, positions.value, cardHeights.value))
const focusedTargetPageIds = computed(() => {
  const idsByPath = new Map(pages.value.map(page => [page.path, page.id]))
  return [...new Set(focusedLinks.value.flatMap(link => {
    const id = positions.value.has(link.to) ? link.to : idsByPath.get(link.to)
    return id && id !== focusedPageId.value ? [id] : []
  }))]
})
const renderedPages = computed(() => getRenderablePages(
  pages.value,
  visiblePageIds.value,
  [...livePreviewCacheIds.value, capturePreviewId.value, focusedPageId.value, ...focusedTargetPageIds.value],
  maximumMountedPreviews.value,
))
const previewPages = computed(() => renderedPages.value.filter(page => shouldRenderPreview(page.id)))
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
const focusedApiResults = computed(() => focusedPageId.value ? apiResultsByPage.value[focusedPageId.value] ?? [] : [])

function toggleApiResult(id: string) {
  const next = new Set(expandedApiResults.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedApiResults.value = next
}

function visibleApiFields(result: PageFlowApiResult) {
  return expandedApiResults.value.has(result.id) ? result.fields : result.fields.filter(field => field.used)
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
  return thumbnailManifest.value[thumbnailSlot(pageId, previewMode.value, 'compact')]
}

function fullThumbnailRecords(pageId: string) {
  return fullThumbnailTiles(thumbnailManifest.value, pageId, previewMode.value)
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
  return visibleThumbnailTiles(
    full,
    pagePosition(page.id)[1],
    { width: canvas.value?.clientWidth ?? 0, height: canvas.value?.clientHeight ?? 0 },
    settledTransform.value,
  )
}

function thumbnailSource(record: PageFlowThumbnailRecord) {
  return thumbnailResources.value[thumbnailUrl(props.config, record)]
}

function pagePreviewHeight(pageId: string) {
  if (previewMode.value === 'mobile')
    return Math.round(PAGE_CARD_WIDTH * currentPreviewMode.value.height / currentPreviewMode.value.width)
  const compact = compactThumbnailRecord(pageId)
  const fullRoot = fullThumbnailRecords(pageId)[0]
  return compact?.pageHeight ?? compact?.height ?? fullRoot?.pageHeight ?? fullRoot?.height
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

function layoutRouteGroup(path: string[]) {
  const layoutPagesList = canvasPagesFor(pages.value, path)
  const layoutPositions = layoutPageGrid(layoutPagesList, new Map(layoutPagesList.map(page => [page.id, pageCardHeight(page.id)])))
  return {
    pages: layoutPagesList,
    positions: centerLayoutHorizontally(layoutPositions, layoutPagesList),
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
  positions.value = centerLayoutHorizontally(layoutPageGrid(layoutPagesList, heights), layoutPagesList)
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
  const resolved = resolvePreviewUrl(path, props.config, window.location.origin, routeMode.value, navigationLocations.value[path])
  const page = pages.value.find(item => item.path === path)
  if (!page || page.id !== focusedPageId.value) return resolved
  const url = new URL(resolved, window.location.origin)
  url.searchParams.set('__unplugin_pageflow_inspect', '1')
  return `${url.pathname}${url.search}${url.hash}`
}

function pageThumbnailRevision(page: PageFlowPage) {
  const location = navigationLocations.value[page.path]
  return location ? `${thumbnailRevision(page)}:${location}` : thumbnailRevision(page)
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
  if (!thumbnailManifestLoaded.value || capturePreviewId.value || viewportInteracting.value) return
  const hasManualCapture = manualCaptureIds.size > 0
  if (hasManualCapture && captureQueue.scheduled) cancelScheduledCapture()
  if (captureQueue.scheduled) return
  const delay = hasManualCapture
    ? 0
    : Math.max(
        backgroundCaptureStarted ? BACKGROUND_CAPTURE_INTERVAL : BACKGROUND_CAPTURE_INITIAL_DELAY,
        backgroundCaptureNotBefore - Date.now(),
      )
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
  if (pageId && !plan.manual) backgroundCaptureStarted = true
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
  const cachedLinks = cached?.links
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
    forcedThumbnailRefreshIds.add(pageId)
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

function centerFocusedPage(pageId: string) {
  if (!leafer || !canvas.value) return
  const position = positions.value.get(pageId)
  if (!position) return
  const scale = Math.max(leafer.zoomLayer.scaleX ?? 1, PAGEFLOW_AUTO_PREVIEW_SCALE)
  const transform = centerPageTransform(
    position,
    pageCardHeight(pageId),
    { width: canvas.value.clientWidth, height: canvas.value.clientHeight },
    scale,
  )
  leafer.zoomLayer.set(transform)
  syncOverlay(false)
}

function requestFocusedPageScan(pageId: string) {
  if (focusedPageId.value !== pageId) return
  previewFrames.get(pageId)?.contentWindow?.postMessage({ type: PAGEFLOW_SCAN_MESSAGE }, window.location.origin)
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

function exitFocusAfterSnapshot() {
  const pageId = focusedPageId.value
  if (!pageId || focusExitPending) return
  focusExitPending = true
  exitFocus(true, () => {
    const queueCapture = () => {
      cancelScheduledCapture()
      forcedThumbnailRefreshIds.add(pageId)
      failedPreviewIds.delete(pageId)
      manualCaptureIds.add(pageId)
      scheduleNextCapture()
      focusExitPending = false
    }
    if (capturesInProgress.has(pageId)) void waitForCapture(pageId).then(queueCapture)
    else queueCapture()
  })
  setTimeout(() => {
    // Another navigation can supersede the exit animation. Never leave the
    // interaction lock stuck while the background capture remains optional.
    focusExitPending = false
  }, 600)
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
  try {
    const response = await fetch(`${props.config.previewPath}api/group-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, name }),
    })
    if (!response.ok) throw new Error('保存失败')
    const next = { ...groupNames.value }
    if (name) next[key] = name
    else delete next[key]
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
    if (routeGroupPath.value.length) enterRouteGroup(routeGroupPath.value.slice(0, -1))
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
  if (!focus) return
  const bounds = canvas.value.getBoundingClientRect()
  const layer = leafer.zoomLayer
  const worldX = (event.clientX - bounds.left - (layer.x ?? 0)) / (layer.scaleX ?? 1)
  const worldY = (event.clientY - bounds.top - (layer.y ?? 0)) / (layer.scaleY ?? 1)
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
  if (focusTargetDrag || !leafer || !canvas.value) return
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
  const bounds = canvas.value.getBoundingClientRect()
  const layer = leafer.zoomLayer
  const scale = layer.scaleX ?? 1
  const worldX = (event.clientX - bounds.left - (layer.x ?? 0)) / scale
  const worldY = (event.clientY - bounds.top - (layer.y ?? 0)) / scale
  const candidates = focusScene.value
    ? [focusScene.value.source, ...focusScene.value.targets.map(target => target.page)]
    : pages.value.filter(page => visiblePageIds.value.has(page.id))
  const metaHit = candidates.some(page => {
    const position = focusScene.value?.source.id === page.id
      ? focusScene.value.sourcePosition
      : (focusScene.value?.targets.find(target => target.page.id === page.id)
        ? [focusScene.value.targets.find(target => target.page.id === page.id)!.x, focusScene.value.targets.find(target => target.page.id === page.id)!.y] as [number, number]
        : positions.value.get(page.id))
    if (!position) return false
    const height = pagePreviewHeight(page.id)
    return worldX >= position[0] && worldX <= position[0] + PAGE_CARD_WIDTH
      && worldY >= position[1] + height + 6 && worldY <= position[1] + height + 58
  })
  if (metaHit) {
    setTimeout(() => {
      if (canvas.value) canvas.value.style.cursor = 'default'
    }, 0)
  }
}

function clearFocusTargetHover() {
  if (focusTargetDrag || hoveredHotspot.value?.centerX != null) return
  setHoveredHotspot(undefined)
}

function handleFocusTargetPointerUp(event: PointerEvent) {
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

function syncPreviewHotspots(pageId: string) {
  const layer = previewFrames.get(pageId)?.contentDocument?.querySelector<HTMLElement>('[data-unplugin-pageflow-hotspot-layer]')
  if (layer) layer.style.display = focusedPageId.value === pageId ? 'block' : 'none'
}

function observePreviewImages(pageId: string, frame: HTMLIFrameElement) {
  const document = frame.contentDocument
  if (!document) return
  const scheduleRefresh = (resourceChanged = false) => {
    if (pageId !== livePreviewId.value && pageId !== capturePreviewId.value && !manualCaptureIds.has(pageId)) return
    if (!resourceChanged && readyPreviewIds.value.has(pageId)) return
    previewChangeVersions.set(pageId, (previewChangeVersions.get(pageId) ?? 0) + 1)
    previewFrames.debounce(pageId, 750, () => {
      if (previewFrames.get(pageId) !== frame || !frame.isConnected) return
      forcedThumbnailRefreshIds.add(pageId)
      failedPreviewIds.delete(pageId)
      scheduleNextCapture()
    })
  }
  const handleLoad = (event: Event) => {
    if (event.target instanceof frame.contentWindow!.HTMLImageElement && event.target.complete && event.target.naturalWidth)
      scheduleRefresh(true)
  }
  const observer = new MutationObserver(records => {
    if (records.every(record => (record.target as Element).closest?.('[data-unplugin-pageflow-hotspot-layer]'))) return
    scheduleRefresh()
    records.forEach(record => {
      if (record.type === 'attributes' && record.target instanceof frame.contentWindow!.HTMLImageElement)
        void record.target.decode().then(() => scheduleRefresh(true), () => undefined)
    })
  })
  document.addEventListener('load', handleLoad, true)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'hidden', 'src', 'srcset', 'style', 'value'],
    characterData: true,
    childList: true,
    subtree: true,
  })
  previewFrames.setCleanup(pageId, () => {
    document.removeEventListener('load', handleLoad, true)
    observer.disconnect()
  })
}

async function handlePreviewLoad(pageId: string, frame: HTMLIFrameElement) {
  try {
    loadedPreviewIds.value = new Set(loadedPreviewIds.value).add(pageId)
    if (pageId === livePreviewId.value) {
      forcedThumbnailRefreshIds.add(pageId)
      failedPreviewIds.delete(pageId)
      scheduleNextCapture()
    }
    observePreviewImages(pageId, frame)
    syncPreviewHotspots(pageId)
    requestFocusedPageScan(pageId)
    await waitForPreviewReady(frame)
    syncPreviewHotspots(pageId)
    readyPreviewIds.value = new Set(readyPreviewIds.value).add(pageId)
    requestFocusedPageScan(pageId)
    const page = pages.value.find(item => item.id === pageId)
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
  const changeVersion = previewChangeVersions.get(pageId) ?? 0
  try {
    if (!ready) await waitForPreviewReady(frame)
    if (generation !== previewGeneration) return
    const body = frame.contentDocument?.body
    if (!body || !frame.isConnected) return
    const records = await capturePageThumbnails({
      config: props.config,
      document: frame.contentDocument!,
      body,
      pageId,
      previewMode: previewMode.value,
      mode: currentPreviewMode.value,
      revision: pageThumbnailRevision(page),
      highResolution: pageId === focusedPageId.value || manualCaptureIds.has(pageId),
    })
    if (generation !== previewGeneration) return
    records.forEach(record => { pendingThumbnailRecords[record.slot] = record })
    if ((previewChangeVersions.get(pageId) ?? 0) === changeVersion)
      forcedThumbnailRefreshIds.delete(pageId)
  } catch (error) {
    forcedThumbnailRefreshIds.delete(pageId)
    failedPreviewIds.add(pageId)
    console.warn(`unplugin-pageflow could not cache ${page.path}`, error)
  } finally {
    capturesInProgress.delete(pageId)
    if (generation === previewGeneration) finishCapture(pageId)
  }
}

function setPreviewMode(mode: PageFlowPreviewMode) {
  if (previewMode.value === mode) return
  cancelScheduledCapture()
  backgroundCaptureStarted = false
  previewGeneration++
  previewMode.value = mode
  try {
    localStorage.setItem(PREVIEW_MODE_STORAGE_KEY, mode)
  } catch {}
  livePreviewId.value = undefined
  livePreviewCacheIds.value = []
  capturePreviewId.value = undefined
  captureBatchIds.clear()
  manualCaptureIds.clear()
  failedPreviewIds.clear()
  Object.keys(pendingThumbnailRecords).forEach(id => delete pendingThumbnailRecords[id])
  requestLayout(pages.value, true)
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
        target = centerPageTransform(currentPosition, pageCardHeight(pageId), viewport, targetScale ?? start.scaleX)
    }
    const transform = progress < 0.5
      ? tween(start, middle, ease(progress * 2))
      : tween(middle, target, ease((progress - 0.5) * 2))
    layer.set(transform)
    syncOverlay(false)
  }, () => {
    clearTimeout(viewportIdleTimer)
    viewportInteracting.value = false
    if (focusedPageId.value === pageId) centerFocusedPage(pageId)
    syncOverlay(true)
  })
}

function handlePreviewMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return
  const sourcePageId = previewFrames.pageIdForSource(event.source)
  const message = decodePreviewMessage(event.data)
  if (!message) return
  if (message.type === 'api-result') {
    if (!sourcePageId) return
    const current = apiResultsByPage.value[sourcePageId] ?? []
    apiResultsByPage.value = {
      ...apiResultsByPage.value,
      [sourcePageId]: [...current.filter(item => item.id !== message.result.id), message.result].slice(-30),
    }
    return
  }
  if (message.type === 'page-reported') {
    if (sourcePageId === focusedPageId.value)
      requestAnimationFrame(() => requestFocusedPageScan(sourcePageId))
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
    if (sourcePageId !== focusedPageId.value || message.path !== pages.value.find(page => page.id === sourcePageId)?.path) return
    const nextLinks = message.links
    focusedLinksScannedPageId = sourcePageId
    syncPreviewHotspots(sourcePageId)
    const targetsChanged = focusTargetSetKey(focusedLinks.value) !== focusTargetSetKey(nextLinks)
    focusedLinks.value = nextLinks
    if (targetsChanged) void requestFocusedLayout()
    else scheduleCanvasRender()
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
  })
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
      ...tiles.map(record => `${record.slot}:${thumbnailSource(record) ?? ''}:${record.tileTop ?? 0}:${record.height}`),
    ].join('|')
    cardNodes?.upsert(page.id, cardSignature, () => {
      const group = routeDeckByPageId.value.has(page.id) && !focusTargets.has(page.id)
        ? createDeckGroup(page, x, y)
        : createCardGroup(page, visualX, visualY, visualScale, page.id === active.value)
      if (target) group.set({ hittable: true, hitChildren: false, cursor: 'move' })
      group.opacity = opacity
      return group
    }, group => group.set({ x: visualX, y: visualY, scaleX: visualScale, scaleY: visualScale, opacity }))
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
      connectionNodes?.upsert(connection.id, connection.id, () => new Path({
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
    connectionLayer = new Group({ hittable: false })
    connectionNodes = new SceneNodeCache(connectionLayer)
    connectionLeafer.add(connectionLayer)
  }
  renderCanvasScene()
  requestAnimationFrame(() => syncOverlay())
}

function applyGraph(nextPages: PageFlowPage[], nextRouteMode: PageFlowRouteMode) {
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
  active.value = plan.activeId
  status.value = plan.status
  if (nextPages.length) {
    routeDiscoveryFrame?.remove()
    routeDiscoveryFrame = undefined
  }
  if (plan.layoutChanged) requestLayout(nextPages)
  else scheduleCanvasRender()
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
  status.value = 'Routes synced'
  if (plan.action === 'layout') void requestFocusedLayout()
  else if (plan.action === 'render') scheduleCanvasRender()
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
watch(focusedPageId, () => previewFrames.forEach((_frame, pageId) => syncPreviewHotspots(pageId)))

onMounted(async () => {
  window.addEventListener('message', handlePreviewMessage)
  layoutWorker = new Worker(new URL('./client/layout.worker.ts', import.meta.url), { type: 'module' })
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
    const nextPositions = centerLayoutHorizontally(new Map<string, [number, number]>(event.data.positions), layoutPagesList)
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
  if (props.config.previewPath === '/') return

  try {
    thumbnailManifest.value = await fetchThumbnailManifest(props.config)
  } catch {
    thumbnailManifest.value = {}
  } finally {
    thumbnailManifestLoaded.value = true
    scheduleInitialSceneReveal()
  }

  stopPageFlowUpdates = subscribeToPageFlowUpdates(props.config, {
    graph: graph => applyGraph(graph.pages, graph.routeMode),
    page: applyPageUpdate,
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
  window.removeEventListener('message', handlePreviewMessage)
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
  hoverAnimation.dispose()
  flightAnimation.dispose()
  focusAnimation.dispose()
  clearTimeout(viewportIdleTimer)
  cancelScheduledCapture()
  clearTimeout(copiedPathTimer)
  clearTimeout(layoutTimeout)
  clearTimeout(initialRevealTimer)
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
  cardLayer = undefined
  cardNodes?.clear()
})
</script>

<template>
  <main @dragstart.prevent>
    <header>
      <div class="brand"><span>✦</span> unplugin-pageflow</div>
      <div class="crumb">
        <button type="button" @click="enterRouteGroup([])">全部页面</button>
        <template v-for="(segment, index) in routeGroupPath" :key="`${segment}:${index}`">
          <span>/</span><button type="button" @click="enterRouteGroup(routeGroupPath.slice(0, index + 1))">{{ segment }}</button>
        </template>
        <span>·</span> {{ canvasPages.length }} 项 / {{ pages.length }} 页
      </div>
      <div class="viewport-switch" aria-label="Preview viewport">
        <button
          v-for="(mode, id) in previewModes"
          :key="id"
          type="button"
          :class="{ active: previewMode === id }"
          :aria-pressed="previewMode === id"
          @click="setPreviewMode(id)"
        >{{ mode.label }}</button>
      </div>
      <span class="mode">DEV ONLY</span>
    </header>
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
            <iframe
              :ref="element => setPreviewFrame(page.id, element as Element | null)"
              :key="`${previewMode}:${page.id}`"
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
      <aside v-if="focusedPageId" class="api-panel">
        <div class="api-panel-heading">
          <strong>页面接口</strong><span>{{ focusedApiResults.length }}</span>
        </div>
        <div v-if="focusedApiResults.length" class="api-panel-list">
          <section v-for="result in focusedApiResults" :key="result.id" class="api-result">
            <div class="api-result-summary">
              <span class="api-method">{{ result.method }}</span>
              <code>{{ result.url }}</code>
              <small :class="{ error: result.status >= 400 }">{{ result.status }} · {{ result.duration }}ms</small>
            </div>
            <div v-if="visibleApiFields(result).length" class="api-fields">
              <div v-for="field in visibleApiFields(result)" :key="field.path" class="api-field" :class="{ unused: !field.used }">
                <code>{{ field.path }}</code><span>{{ field.value }}</span>
              </div>
            </div>
            <div v-else class="api-empty">页面暂未展示返回字段</div>
            <button v-if="result.fields.some(field => !field.used)" type="button" class="api-expand" @click="toggleApiResult(result.id)">
              {{ expandedApiResults.has(result.id) ? '收起未使用字段' : `展开 ${result.fields.filter(field => !field.used).length} 个未使用字段` }}
            </button>
          </section>
        </div>
        <div v-else class="api-panel-waiting">等待页面接口响应…</div>
      </aside>
    </section>
    <div class="zoom"><button type="button" @click="zoomCanvas('in')">+</button><span>{{ zoomPercent }}%</span><button type="button" @click="zoomCanvas('out')">−</button></div>
    <footer><span><i></i> {{ status }}</span><span>Last synced just now</span></footer>
  </main>
</template>
