<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import html2canvas from 'html2canvas'
import { Leafer, Rect, Text, Group, Image as LeaferImage, MoveEvent, Path, ZoomEvent } from 'leafer-ui'
import '@leafer-in/view'
import '@leafer-in/viewport'
import type {
  PageFlowPage,
  PageFlowRouteMode,
  PageFlowThumbnailManifest,
  PageFlowThumbnailRecord,
  ResolvedPageFlowOptions,
} from './shared/types'
import { fetchPageFlowGraph, reportPageTitle, scanPageLinks, startRouteDiscovery, subscribeToPageFlowUpdates } from './client/graph'
import { resolvePreviewUrl, touchPreviewCache } from './client/preview'
import { PAGEFLOW_NAVIGATE_MESSAGE, PAGEFLOW_WHEEL_MESSAGE } from './shared/protocol'
import { forwardWheelToCanvas, PAGEFLOW_CANVAS_CONFIG, type PageFlowWheelInteraction } from './client/canvas'
import { boundedPreviewDocumentHeight, materializeMaskedIcons, waitForPreviewReady } from './client/snapshot'
import { ThumbnailResourceCache } from './client/thumbnail-resources'
import {
  canvasToBlob,
  extractThumbnailTile,
  fetchThumbnailManifest,
  fullThumbnailTiles,
  resizeThumbnail,
  saveThumbnail,
  thumbnailRevision,
  thumbnailSlot,
  thumbnailTileCount,
  thumbnailTierForZoom,
  thumbnailUrl,
  visibleThumbnailTiles,
  type PageFlowPreviewMode,
  type PageFlowThumbnailTier,
  PAGEFLOW_THUMBNAIL_TILE_HEIGHT,
} from './client/thumbnails'
import {
  centerPageTransform,
  createPageSpatialIndex,
  getAutoPreviewPageId,
  getRenderablePages,
  getVisiblePageIds,
  layoutPagesByRoute,
  PAGE_CARD_META_HEIGHT,
  PAGE_CARD_WIDTH,
  PAGE_PREVIEW_INSET,
  type CanvasTransform,
} from './client/layout'

const props = defineProps<{ config: ResolvedPageFlowOptions }>()

const previewModes = {
  mobile: { label: '手机', width: 390, height: 844 },
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
const active = ref('home')
const status = ref(props.config.previewPath === '/' ? 'Demo data' : 'Discovering routes…')
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
const livePreviewCacheIds = ref<string[]>([])
const loadedPreviewIds = ref(new Set<string>())
const readyPreviewIds = ref(new Set<string>())
const routeMode = ref<PageFlowRouteMode>('history')
const capturePreviewId = ref<string>()
const copiedPath = ref<string>()
const canvas = ref<HTMLDivElement>()
const overlayWorld = ref<HTMLDivElement>()
let leafer: Leafer | undefined
let edgeLayer: Group | undefined
let cardLayer: Group | undefined
let renderedEdgeSignature = ''
const cardNodes = new Map<string, { node: Group, signature: string }>()
let viewportFrame = 0
let flightFrame = 0
let viewportIdleTimer: ReturnType<typeof setTimeout> | undefined
let viewportAutoPreview = true
let copiedPathTimer: ReturnType<typeof setTimeout> | undefined
let routeDiscoveryFrame: HTMLIFrameElement | undefined
let layoutWorker: Worker | undefined
let stopPageFlowUpdates: (() => void) | undefined
let layoutRequestId = 0
let animateLayoutRequest = false
let layoutTimeout: ReturnType<typeof setTimeout> | undefined
let initialRevealTimer: ReturnType<typeof setTimeout> | undefined
let pendingLinkScan: PageFlowPage[] | undefined
let scanningLinks = false
let linkScanSignature = ''
const scannedLinkPaths = new Set<string>()
const failedPreviewIds = new Set<string>()
const forcedThumbnailRefreshIds = new Set<string>()
const manualCaptureIds = new Set<string>()
const previewFrames = new Map<string, HTMLIFrameElement>()
const previewImageCleanups = new Map<string, () => void>()
const previewImageTimers = new Map<string, ReturnType<typeof setTimeout>>()
const previewChangeVersions = new Map<string, number>()
const capturesInProgress = new Set<string>()
const pendingThumbnailRecords: PageFlowThumbnailManifest = {}
let captureBatchIds = new Set<string>()
let previewGeneration = 0
const MAX_MOUNTED_PREVIEWS = 96
const thumbnailResourceCache = new ThumbnailResourceCache(160)
let thumbnailResourceGeneration = 0
let thumbnailRenderFrame = 0
const currentPreviewMode = computed(() => previewModes[previewMode.value])
const maximumMountedPreviews = computed(() => {
  if (zoomPercent.value < 5) return 0
  if (thumbnailTier.value === 'compact') return pages.value.length
  return MAX_MOUNTED_PREVIEWS
})
const cardHeights = computed(() => new Map(pages.value.map(page => [page.id, pageCardHeight(page.id)])))
const positions = ref(layoutPagesByRoute(pages.value, cardHeights.value))
const spatialIndex = computed(() => createPageSpatialIndex(pages.value, positions.value, cardHeights.value))
const renderedPages = computed(() => getRenderablePages(
  pages.value,
  visiblePageIds.value,
  [...livePreviewCacheIds.value, capturePreviewId.value],
  maximumMountedPreviews.value,
))
const previewPages = computed(() => renderedPages.value.filter(page => shouldRenderPreview(page.id)))
const requiredThumbnailRecords = computed(() => renderedPages.value.flatMap(page => {
  const records = pageThumbnailTiles(page)
  const compact = compactThumbnailRecord(page.id)
  if (thumbnailTier.value === 'compact') return compact ? [compact] : records
  return compact && !records.some(record => record.slot === compact.slot)
    ? [compact, ...records]
    : records
}))
const connectionPaths = computed(() => {
  const idsByPath = new Map(pages.value.map(page => [page.path, page.id]))
  const rightCorridor = Math.max(0, ...pages.value.map(page => (positions.value.get(page.id)?.[0] ?? 0) + PAGE_CARD_WIDTH)) + 80
  const rowBottoms = new Map<number, number>()
  pages.value.forEach(page => {
    const position = positions.value.get(page.id)
    if (!position) return
    rowBottoms.set(position[1], Math.max(rowBottoms.get(position[1]) ?? -Infinity, position[1] + pageCardHeight(page.id)))
  })
  const previousRowBottoms = new Map<number, number>()
  let previousRowBottom = -Infinity
  ;[...rowBottoms.keys()].sort((left, right) => left - right).forEach(rowTop => {
    previousRowBottoms.set(rowTop, previousRowBottom)
    previousRowBottom = Math.max(previousRowBottom, rowBottoms.get(rowTop)!)
  })
  return pages.value.flatMap(source => source.links.flatMap((link, index) => {
    if (!link.hotspot) return []
    const targetId = positions.value.has(link.to) ? link.to : idsByPath.get(link.to)
    const sourcePosition = positions.value.get(source.id)
    const targetPosition = targetId && positions.value.get(targetId)
    if (!sourcePosition || !targetPosition || targetId === source.id) return []
    const sourceHeight = pagePreviewHeight(source.id)
    const targetHeight = pagePreviewHeight(targetId)
    const start = {
      x: sourcePosition[0] + link.hotspot.centerX * PAGE_CARD_WIDTH,
      y: sourcePosition[1] + link.hotspot.centerY * sourceHeight,
    }
    const sameRow = sourcePosition[1] === targetPosition[1]
    const previousRowBottom = previousRowBottoms.get(sourcePosition[1]) ?? -Infinity
    const rowLane = Number.isFinite(previousRowBottom)
      ? Math.min(sourcePosition[1] - 18, previousRowBottom + Math.max(18, (sourcePosition[1] - previousRowBottom) / 2) - index * 12)
      : sourcePosition[1] - 56 - index * 12
    const points = sameRow
      ? [start, { x: start.x, y: sourcePosition[1] }, { x: start.x, y: rowLane }, { x: targetPosition[0] + PAGE_CARD_WIDTH / 2, y: rowLane }, { x: targetPosition[0] + PAGE_CARD_WIDTH / 2, y: targetPosition[1] }]
      : [start, { x: sourcePosition[0] + PAGE_CARD_WIDTH, y: start.y }, { x: rightCorridor + index * 12, y: start.y }, { x: rightCorridor + index * 12, y: targetPosition[1] + targetHeight / 2 }, { x: targetPosition[0] + PAGE_CARD_WIDTH, y: targetPosition[1] + targetHeight / 2 }]
    return [{ id: `${source.id}:${index}:${targetId}`, d: roundedConnectionPath(points) }]
  }))
})

function roundedConnectionPath(points: Array<{ x: number, y: number }>, radius = 16) {
  if (points.length < 2) return ''
  let path = `M${points[0].x} ${points[0].y}`
  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1]
    const corner = points[index]
    const next = points[index + 1]
    const incoming = Math.hypot(corner.x - previous.x, corner.y - previous.y)
    const outgoing = Math.hypot(next.x - corner.x, next.y - corner.y)
    if (!incoming || !outgoing) continue
    const amount = Math.min(radius, incoming / 2, outgoing / 2)
    const before = {
      x: corner.x - (corner.x - previous.x) / incoming * amount,
      y: corner.y - (corner.y - previous.y) / incoming * amount,
    }
    const after = {
      x: corner.x + (next.x - corner.x) / outgoing * amount,
      y: corner.y + (next.y - corner.y) / outgoing * amount,
    }
    path += ` L${before.x} ${before.y} Q${corner.x} ${corner.y} ${after.x} ${after.y}`
  }
  const end = points[points.length - 1]
  return `${path} L${end.x} ${end.y}`
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

function requestLayout(nextPages = pages.value, animate = false) {
  if (!initialSceneReady.value) {
    clearTimeout(initialRevealTimer)
    initialLayoutSettled.value = false
  }
  const id = ++layoutRequestId
  animateLayoutRequest = animate
  const heights = new Map(nextPages.map(page => [page.id, pageCardHeight(page.id)]))
  if (!layoutWorker) {
    positions.value = layoutPagesByRoute(nextPages, heights)
    draw()
    initialLayoutSettled.value = true
    scheduleInitialSceneReveal()
    return
  }
  status.value = `Laying out ${nextPages.length} pages…`
  layoutWorker.postMessage({ id, pages: nextPages, cardHeights: [...heights] })
  clearTimeout(layoutTimeout)
  layoutTimeout = setTimeout(() => {
    if (id !== layoutRequestId) return
    layoutWorker?.terminate()
    layoutWorker = undefined
    status.value = pages.value.length ? 'Routes synced' : status.value
  }, 8000)
}

function scheduleInitialSceneReveal() {
  if (initialSceneReady.value || !thumbnailManifestLoaded.value || !initialLayoutSettled.value || !initialResourcesSettled.value) return
  clearTimeout(initialRevealTimer)
  initialRevealTimer = setTimeout(() => { initialSceneReady.value = true }, 120)
}

function previewUrl(path: string) {
  return resolvePreviewUrl(path, props.config, window.location.origin, routeMode.value, navigationLocations.value[path])
}

function pageThumbnailRevision(page: PageFlowPage) {
  const location = navigationLocations.value[page.path]
  return location ? `${thumbnailRevision(page)}:${location}` : thumbnailRevision(page)
}

function syncOverlay(updateVisiblePages = true, updateAutoPreview = true) {
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
  if (!updateVisiblePages) return
  settledTransform.value = transform
  const nextVisible = getVisiblePageIds(
    pages.value,
    positions.value,
    { width: canvas.value?.clientWidth ?? 0, height: canvas.value?.clientHeight ?? 0 },
    transform,
    240,
    cardHeights.value,
    pages.value.length,
    spatialIndex.value,
  )
  let sceneChanged = false
  if (nextVisible.size !== visiblePageIds.value.size || [...nextVisible].some(id => !visiblePageIds.value.has(id)))
  {
    visiblePageIds.value = nextVisible
    sceneChanged = true
  }
  if (updateAutoPreview) {
    const nextLivePreviewId = getAutoPreviewPageId(
      pages.value,
      positions.value,
      { width: canvas.value?.clientWidth ?? 0, height: canvas.value?.clientHeight ?? 0 },
      transform,
      cardHeights.value,
      spatialIndex.value,
    )
    if (nextLivePreviewId && nextLivePreviewId !== livePreviewId.value) {
      active.value = nextLivePreviewId
      livePreviewId.value = nextLivePreviewId
      livePreviewCacheIds.value = touchPreviewCache(livePreviewCacheIds.value, nextLivePreviewId)
      forcedThumbnailRefreshIds.add(nextLivePreviewId)
      failedPreviewIds.delete(nextLivePreviewId)
      sceneChanged = true
    }
  }
  if (sceneChanged) renderCanvasScene()
  scheduleNextCapture()
}

function handleViewportTransform(updateAutoPreview = true) {
  viewportInteracting.value = true
  viewportAutoPreview &&= updateAutoPreview
  if (!viewportFrame) viewportFrame = requestAnimationFrame(() => {
    viewportFrame = 0
    syncOverlay(false)
  })
  clearTimeout(viewportIdleTimer)
  viewportIdleTimer = setTimeout(() => {
    viewportInteracting.value = false
    syncOverlay(true, viewportAutoPreview)
    viewportAutoPreview = true
  }, 120)
}

function shouldRenderPreview(pageId: string) {
  return props.config.previewPath !== '/'
    && (capturePreviewId.value === pageId || livePreviewCacheIds.value.includes(pageId))
}

function scheduleNextCapture() {
  if (!thumbnailManifestLoaded.value || capturePreviewId.value || viewportInteracting.value || (thumbnailTier.value === 'compact' && !manualCaptureIds.size)) return
  if (!captureBatchIds.size) {
    captureBatchIds = new Set(renderedPages.value.flatMap(page =>
      !thumbnailIsCurrent(page) && !failedPreviewIds.has(page.id)
        ? [page.id]
      : [],
    ))
  }
  manualCaptureIds.forEach(id => captureBatchIds.add(id))
  capturePreviewId.value = [...manualCaptureIds].find(id => captureBatchIds.has(id))
    ?? captureBatchIds.values().next().value
  const pageId = capturePreviewId.value
  if (pageId) void nextTick(() => {
    const frame = previewFrames.get(pageId)
    if (frame?.contentDocument?.readyState === 'complete')
      void capturePreview(pageId, frame, manualCaptureIds.has(pageId))
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
  if (!captureBatchIds.size) {
    requestLayout()
  }
  scheduleNextCapture()
}

function activatePreview(pageId: string) {
  active.value = pageId
  livePreviewId.value = pageId
  livePreviewCacheIds.value = touchPreviewCache(livePreviewCacheIds.value, pageId)
  forcedThumbnailRefreshIds.add(pageId)
  failedPreviewIds.delete(pageId)
  renderCanvasScene()
  scheduleNextCapture()
}

function refreshPageSnapshot(pageId: string) {
  previewGeneration++
  capturePreviewId.value = undefined
  captureBatchIds.clear()
  manualCaptureIds.clear()
  capturesInProgress.delete(pageId)
  active.value = pageId
  livePreviewId.value = pageId
  livePreviewCacheIds.value = touchPreviewCache(livePreviewCacheIds.value, pageId)
  forcedThumbnailRefreshIds.add(pageId)
  failedPreviewIds.delete(pageId)
  manualCaptureIds.add(pageId)
  renderCanvasScene()
  scheduleNextCapture()
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

function handleCanvasClick(event: MouseEvent) {
  if (!leafer || !canvas.value || viewportInteracting.value) return
  const bounds = canvas.value.getBoundingClientRect()
  const layer = leafer.zoomLayer
  const worldX = (event.clientX - bounds.left - (layer.x ?? 0)) / (layer.scaleX ?? 1)
  const worldY = (event.clientY - bounds.top - (layer.y ?? 0)) / (layer.scaleY ?? 1)
  const page = [...pages.value].reverse().find(item => {
    if (!visiblePageIds.value.has(item.id)) return false
    const position = positions.value.get(item.id)
    if (!position) return false
    const previewH = pagePreviewHeight(item.id)
    const insideRefresh = worldX >= position[0] - 36 && worldX <= position[0] - 8
      && worldY >= position[1] && worldY <= position[1] + 28
    const insideCard = worldX >= position[0] && worldX <= position[0] + PAGE_CARD_WIDTH
      && worldY >= position[1] && worldY <= position[1] + previewH + 56
    return insideRefresh || insideCard
  })
  if (!page) return
  const position = positions.value.get(page.id)!
  const localX = worldX - position[0]
  const localY = worldY - position[1]
  const previewH = pagePreviewHeight(page.id)
  if (localX >= -36 && localX <= -8 && localY >= 0 && localY <= 28) refreshPageSnapshot(page.id)
  else if (localX >= 0 && localX <= PAGE_CARD_WIDTH && localY >= previewH + 32 && localY <= previewH + 56) void copyPagePath(page.path)
  else if (localX >= 0 && localX <= PAGE_CARD_WIDTH && localY >= 0 && localY <= previewH) activatePreview(page.id)
}

function setPreviewFrame(pageId: string, element: Element | null) {
  if (element instanceof HTMLIFrameElement) {
    if (previewFrames.get(pageId) !== element) {
      loadedPreviewIds.value = new Set([...loadedPreviewIds.value].filter(id => id !== pageId))
      readyPreviewIds.value = new Set([...readyPreviewIds.value].filter(id => id !== pageId))
      previewFrames.set(pageId, element)
    }
  } else {
    previewFrames.delete(pageId)
    previewImageCleanups.get(pageId)?.()
    previewImageCleanups.delete(pageId)
    const timer = previewImageTimers.get(pageId)
    if (timer) clearTimeout(timer)
    previewImageTimers.delete(pageId)
  }
}

function observePreviewImages(pageId: string, frame: HTMLIFrameElement) {
  previewImageCleanups.get(pageId)?.()
  const document = frame.contentDocument
  if (!document) return
  const scheduleRefresh = (resourceChanged = false) => {
    if (pageId !== livePreviewId.value && pageId !== capturePreviewId.value && !manualCaptureIds.has(pageId)) return
    if (!resourceChanged && readyPreviewIds.value.has(pageId)) return
    previewChangeVersions.set(pageId, (previewChangeVersions.get(pageId) ?? 0) + 1)
    const currentTimer = previewImageTimers.get(pageId)
    if (currentTimer) clearTimeout(currentTimer)
    previewImageTimers.set(pageId, setTimeout(() => {
      previewImageTimers.delete(pageId)
      if (previewFrames.get(pageId) !== frame || !frame.isConnected) return
      forcedThumbnailRefreshIds.add(pageId)
      failedPreviewIds.delete(pageId)
      scheduleNextCapture()
    }, 750))
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
  previewImageCleanups.set(pageId, () => {
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
    await waitForPreviewReady(frame)
    readyPreviewIds.value = new Set(readyPreviewIds.value).add(pageId)
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
    const mode = currentPreviewMode.value
    const fullHeight = boundedPreviewDocumentHeight(frame.contentDocument!, mode.height)
    const snapshot = await html2canvas(body, {
      backgroundColor: '#fff',
      height: fullHeight,
      logging: false,
      onclone: materializeMaskedIcons,
      scale: PAGE_CARD_WIDTH / mode.width,
      useCORS: true,
      width: mode.width,
      windowHeight: mode.height,
      windowWidth: mode.width,
    })
    if (generation !== previewGeneration) return
    const displayScale = PAGE_CARD_WIDTH / snapshot.width
    const displayHeight = Math.round(snapshot.height * displayScale)
    const compact = resizeThumbnail(snapshot, 96)
    const compactRecord = await saveThumbnail(props.config, {
      slot: thumbnailSlot(pageId, previewMode.value, 'compact'),
      revision: pageThumbnailRevision(page),
      width: compact.width,
      height: displayHeight,
      pageHeight: displayHeight,
    }, await canvasToBlob(compact))
    pendingThumbnailRecords[compactRecord.slot] = compactRecord
    compact.width = 0
    compact.height = 0

    const tileCount = thumbnailTileCount(snapshot)
    for (let tileIndex = tileCount - 1; tileIndex >= 0; tileIndex--) {
      const tile = extractThumbnailTile(snapshot, tileIndex)
      const record = await saveThumbnail(props.config, {
        slot: thumbnailSlot(pageId, previewMode.value, 'full', tileIndex),
        revision: pageThumbnailRevision(page),
        width: tile.width,
        height: Math.round(tile.height * displayScale),
        pageHeight: displayHeight,
        tileCount,
        tileIndex,
        tileTop: Math.round(tileIndex * PAGEFLOW_THUMBNAIL_TILE_HEIGHT * displayScale),
      }, await canvasToBlob(tile))
      pendingThumbnailRecords[record.slot] = record
      tile.width = 0
      tile.height = 0
    }
    snapshot.width = 0
    snapshot.height = 0
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
  requestAnimationFrame(syncOverlay)
}

function dispatchCanvasWheel(event: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>, clientX: number, clientY: number) {
  forwardWheelToCanvas(leafer?.interaction as PageFlowWheelInteraction | undefined, event, clientX, clientY)
}

function handleOverlayWheel(event: WheelEvent) {
  event.preventDefault()
  dispatchCanvasWheel(event, event.clientX, event.clientY)
}

function flyToPage(pageId: string, targetPosition = positions.value.get(pageId), midpoint?: () => void) {
  if (!leafer || !canvas.value || !targetPosition) return
  cancelAnimationFrame(flightFrame)
  const layer = leafer.zoomLayer
  const viewport = { width: canvas.value.clientWidth, height: canvas.value.clientHeight }
  const start: CanvasTransform = {
    x: layer.x ?? 0,
    y: layer.y ?? 0,
    scaleX: layer.scaleX ?? 1,
    scaleY: layer.scaleY ?? 1,
  }
  const target = centerPageTransform(targetPosition, pageCardHeight(pageId), viewport, start.scaleX)
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
  const startedAt = performance.now()
  const duration = 680
  let midpointApplied = false
  viewportInteracting.value = true
  const ease = (value: number) => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2
  const tween = (from: CanvasTransform, to: CanvasTransform, amount: number): CanvasTransform => ({
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    scaleX: from.scaleX + (to.scaleX - from.scaleX) * amount,
    scaleY: from.scaleY + (to.scaleY - from.scaleY) * amount,
  })
  const animate = (time: number) => {
    const progress = Math.min(1, (time - startedAt) / duration)
    if (progress >= 0.5 && !midpointApplied) {
      midpointApplied = true
      midpoint?.()
    }
    const transform = progress < 0.5
      ? tween(start, middle, ease(progress * 2))
      : tween(middle, target, ease((progress - 0.5) * 2))
    layer.set(transform)
    syncOverlay(false)
    if (progress < 1) flightFrame = requestAnimationFrame(animate)
    else {
      flightFrame = 0
      clearTimeout(viewportIdleTimer)
      viewportInteracting.value = false
      syncOverlay(true, false)
    }
  }
  flightFrame = requestAnimationFrame(animate)
}

function handlePreviewMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return
  if (event.data?.type === PAGEFLOW_WHEEL_MESSAGE) {
    const frame = [...previewFrames.values()].find(item => item.contentWindow === event.source)
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    dispatchCanvasWheel(
      event.data,
      rect.left + Number(event.data.clientX) * rect.width / frame.clientWidth,
      rect.top + Number(event.data.clientY) * rect.height / frame.clientHeight,
    )
    return
  }
  if (event.data?.type !== PAGEFLOW_NAVIGATE_MESSAGE) return
  const sourcePageId = [...previewFrames.entries()].find(([, frame]) => frame.contentWindow === event.source)?.[0]
  if (!sourcePageId || sourcePageId !== livePreviewId.value || !readyPreviewIds.value.has(sourcePageId)) return
  const target = pages.value.find(page => page.path === event.data.to)
  const position = target && positions.value.get(target.id)
  if (!target || !position || !leafer || !canvas.value) return
  if (typeof event.data.location === 'string' && event.data.location) {
    readyPreviewIds.value = new Set([...readyPreviewIds.value].filter(id => id !== target.id))
    navigationLocations.value = { ...navigationLocations.value, [target.path]: event.data.location }
    failedPreviewIds.delete(target.id)
  }
  active.value = target.id
  livePreviewId.value = target.id
  livePreviewCacheIds.value = touchPreviewCache(livePreviewCacheIds.value, target.id)
  flyToPage(target.id, position)
}

function renderCanvasScene() {
  if (!leafer) return
  if (!edgeLayer || !cardLayer) {
    edgeLayer = new Group({ hittable: false })
    cardLayer = new Group({ hittable: true, hitChildren: true })
    cardNodes.clear()
    leafer.add(edgeLayer)
    leafer.add(cardLayer)
  }
  const cardW = PAGE_CARD_WIDTH
  if (!pages.value.length) {
    edgeLayer.removeAll(true)
    cardLayer.removeAll(true)
    cardNodes.clear()
    renderedEdgeSignature = ''
    if (canvas.value) {
      canvas.value.dataset.renderedPages = '0'
      canvas.value.dataset.renderedEdges = '0'
    }
    cardLayer.add(new Text({ x: 80, y: 90, text: 'Waiting for Vue Router…', fontSize: 20, fill: '#958d82' }))
    return
  }
  if (!cardNodes.size && cardLayer.children?.length) cardLayer.removeAll(true)
  const edgeSignature = connectionPaths.value.map(connection => `${connection.id}:${connection.d}`).join('|')
  if (edgeSignature !== renderedEdgeSignature) {
    renderedEdgeSignature = edgeSignature
    edgeLayer.removeAll(true)
    connectionPaths.value.forEach(connection => edgeLayer!.add(new Path({
      path: connection.d,
      stroke: '#e1d9cf',
      strokeWidth: 2,
      strokeScaleFixed: true,
      dashPattern: [7, 5],
      endArrow: 'triangle',
      hittable: false,
    })))
  }
  const scenePages = pages.value.filter(page => visiblePageIds.value.has(page.id))
  const scenePageIds = new Set(scenePages.map(page => page.id))
  cardNodes.forEach((entry, pageId) => {
    if (scenePageIds.has(pageId)) return
    cardLayer!.remove(entry.node, true)
    cardNodes.delete(pageId)
  })
  scenePages.forEach(page => {
    const [x, y] = positions.value.get(page.id)!
    const previewH = pagePreviewHeight(page.id)
    const cardH = pageCardHeight(page.id)
    const tiles = pageThumbnailTiles(page)
    const cardSignature = [
      x,
      y,
      previewH,
      page.title,
      page.path,
      page.id === active.value,
      copiedPath.value === page.path,
      capturePreviewId.value === page.id,
      ...tiles.map(record => `${record.slot}:${thumbnailSource(record) ?? ''}:${record.tileTop ?? 0}:${record.height}`),
    ].join('|')
    const existing = cardNodes.get(page.id)
    if (existing?.signature === cardSignature) return
    if (existing) cardLayer!.remove(existing.node, true)
    const group = new Group({ x, y, hittable: true, hitChildren: true })
    group.add(new Rect({ width: cardW, height: cardH, fill: '#303336', shadow: { x: 0, y: 8, blur: 20, color: '#090a0b40' } }))
    group.add(new Rect({ width: cardW, height: previewH, fill: '#fff' }))
    let hasThumbnail = false
    tiles.forEach(record => {
      const url = thumbnailSource(record)
      if (!url) return
      hasThumbnail = true
      group.add(new LeaferImage({
        x: 0,
        y: record.tileTop ?? 0,
        width: cardW,
        height: record.tileIndex == null ? record.pageHeight ?? record.height : record.height,
        url,
        hittable: false,
      }))
    })
    if (!hasThumbnail) {
      group.add(new Text({ x: 16, y: Math.max(16, previewH - 54), width: cardW - 32, text: page.title, fill: '#242628', fontSize: 18, fontWeight: 700, textWrap: 'none', textOverflow: 'ellipsis' }))
      group.add(new Text({ x: 16, y: Math.max(38, previewH - 29), width: cardW - 32, text: page.path, fill: '#6f7478', fontFamily: 'DM Mono', fontSize: 10, textWrap: 'none', textOverflow: 'ellipsis' }))
    }
    group.add(new Text({ x: 0, y: previewH + 12, width: cardW, text: page.title, fill: page.id === active.value ? page.accent : '#f0f1f2', fontSize: 16, fontWeight: 700, textWrap: 'none', textOverflow: 'ellipsis' }))
    group.add(new Text({ x: 0, y: previewH + 38, width: cardW, text: copiedPath.value === page.path ? '已复制' : page.path, fill: '#969b9f', fontFamily: 'DM Mono', fontSize: 10, textWrap: 'none', textOverflow: 'ellipsis' }))
    const refresh = new Group({ x: -36, y: 0, cursor: 'pointer' })
    refresh.add(new Rect({ width: 28, height: 28, fill: capturePreviewId.value === page.id ? '#ff795de6' : '#16181ab8', stroke: '#ffffff52', strokeWidth: 1, cornerRadius: 6 }))
    refresh.add(new Text({ x: 4, y: 1, width: 20, height: 24, text: '↻', fill: '#fff', fontSize: 20, textAlign: 'center', textWrap: 'none' }))
    group.add(refresh)
    cardLayer!.add(group)
    cardNodes.set(page.id, { node: group, signature: cardSignature })
  })
  if (canvas.value) {
    canvas.value.dataset.renderedPages = String(scenePages.length)
    canvas.value.dataset.renderedEdges = String(connectionPaths.value.length)
  }
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
  }
  renderCanvasScene()
  requestAnimationFrame(syncOverlay)
}

function applyGraph(nextPages: PageFlowPage[], nextRouteMode: PageFlowRouteMode) {
  const layoutChanged = pages.value.length !== nextPages.length
    || pages.value.some((page, index) => page.id !== nextPages[index]?.id || page.path !== nextPages[index]?.path)
  if (routeMode.value !== nextRouteMode) {
    routeMode.value = nextRouteMode
    livePreviewId.value = undefined
    livePreviewCacheIds.value = []
  }
  const nextPageIds = new Set(nextPages.map(page => page.id))
  livePreviewCacheIds.value = livePreviewCacheIds.value.filter(id => nextPageIds.has(id))
  if (livePreviewId.value && !nextPageIds.has(livePreviewId.value)) livePreviewId.value = undefined
  pages.value = nextPages
  if (!nextPages.some(page => page.id === active.value)) active.value = nextPages[0]?.id ?? ''
  status.value = nextPages.length ? 'Routes synced' : 'Waiting for Vue Router…'
  if (nextPages.length) {
    routeDiscoveryFrame?.remove()
    routeDiscoveryFrame = undefined
  }
  const nextLinkScanSignature = `${routeMode.value}\n${nextPages.map(page => page.path).join('\n')}`
  if (nextLinkScanSignature !== linkScanSignature) {
    linkScanSignature = nextLinkScanSignature
    scannedLinkPaths.clear()
  }
  if (layoutChanged) requestLayout(nextPages)
  else renderCanvasScene()
  queueInitialLinkScan()
}

function applyPageUpdate(nextPage: PageFlowPage) {
  const index = pages.value.findIndex(page => page.id === nextPage.id)
  if (index < 0) return
  const currentPage = pages.value[index]
  if (JSON.stringify(currentPage) === JSON.stringify(nextPage)) return
  const linksChanged = JSON.stringify(currentPage.links) !== JSON.stringify(nextPage.links)
  const nextPages = [...pages.value]
  nextPages[index] = nextPage
  pages.value = nextPages
  status.value = 'Routes synced'
  if (linksChanged) renderCanvasScene()
}

function queueInitialLinkScan() {
  queueLinkScan(pages.value)
}

function queueLinkScan(nextPages: PageFlowPage[]) {
  const nextBatch = nextPages.filter(page => !scannedLinkPaths.has(page.path))
  if (!nextBatch.length) return
  nextBatch.forEach(page => scannedLinkPaths.add(page.path))
  const pendingByPath = new Map((pendingLinkScan ?? []).map(page => [page.path, page]))
  nextBatch.forEach(page => pendingByPath.set(page.path, page))
  pendingLinkScan = [...pendingByPath.values()]
  if (scanningLinks) return
  scanningLinks = true
  void (async () => {
    while (pendingLinkScan) {
      const batch = pendingLinkScan
      pendingLinkScan = undefined
      status.value = `Scanning ${batch.length} page links…`
      await scanPageLinks(props.config, batch, routeMode.value, currentPreviewMode.value)
    }
    scanningLinks = false
    status.value = 'Routes synced'
  })()
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
  renderCanvasScene()
  void Promise.all(urls.map(async url => {
    try {
      const source = cachedResources.get(url) ?? await thumbnailResourceCache.load(url)
      if (generation === thumbnailResourceGeneration && thumbnailResources.value[url] !== source) {
        thumbnailResources.value = { ...thumbnailResources.value, [url]: source }
        if (!thumbnailRenderFrame) thumbnailRenderFrame = requestAnimationFrame(() => {
          thumbnailRenderFrame = 0
          renderCanvasScene()
        })
      }
      return [url, source] as const
    } catch {
      return undefined
    }
  })).then(resources => {
    if (generation !== thumbnailResourceGeneration) return
    thumbnailResources.value = Object.fromEntries(resources.filter(resource => resource != null))
    thumbnailResourceCache.trim(new Set(urls))
    renderCanvasScene()
    initialResourcesSettled.value = true
    scheduleInitialSceneReveal()
  })
}, { immediate: true })

watch([active, copiedPath], () => renderCanvasScene())

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
    const nextPositions = new Map<string, [number, number]>(event.data.positions)
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
  cancelAnimationFrame(viewportFrame)
  cancelAnimationFrame(thumbnailRenderFrame)
  cancelAnimationFrame(flightFrame)
  clearTimeout(viewportIdleTimer)
  clearTimeout(copiedPathTimer)
  clearTimeout(layoutTimeout)
  clearTimeout(initialRevealTimer)
  thumbnailResourceGeneration++
  thumbnailResourceCache.dispose()
  previewFrames.clear()
  previewImageCleanups.forEach(cleanup => cleanup())
  previewImageCleanups.clear()
  previewImageTimers.forEach(timer => clearTimeout(timer))
  previewImageTimers.clear()
  routeDiscoveryFrame?.remove()
  stopPageFlowUpdates?.()
  layoutWorker?.terminate()
  leafer?.destroy()
  edgeLayer = undefined
  cardLayer = undefined
  renderedEdgeSignature = ''
  cardNodes.clear()
})
</script>

<template>
  <main @dragstart.prevent>
    <header>
      <div class="brand"><span>✦</span> unplugin-pageflow</div>
      <div class="crumb">Untitled flow <span>/</span> {{ pages.length }} pages</div>
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
            :style="{ left: `${pagePosition(page.id)[0] + PAGE_PREVIEW_INSET}px`, top: `${pagePosition(page.id)[1] + PAGE_PREVIEW_INSET}px`, height: `${pagePreviewHeight(page.id)}px`, pointerEvents: livePreviewId === page.id && loadedPreviewIds.has(page.id) && !viewportInteracting ? 'auto' : 'none' }"
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
    </section>
    <div class="zoom"><button type="button" @click="zoomCanvas('in')">+</button><span>{{ zoomPercent }}%</span><button type="button" @click="zoomCanvas('out')">−</button></div>
    <footer><span><i></i> {{ status }}</span><span>Last synced just now</span></footer>
  </main>
</template>
