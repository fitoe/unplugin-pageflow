<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import html2canvas from 'html2canvas'
import { Leafer, Rect, Text, Line, Group, MoveEvent, ZoomEvent } from 'leafer-ui'
import '@leafer-in/view'
import '@leafer-in/viewport'
import type {
  PageFlowPage,
  PageFlowRouteMode,
  PageFlowThumbnailManifest,
  PageFlowThumbnailRecord,
  ResolvedPageFlowOptions,
} from './shared/types'
import { fetchPageFlowGraph, scanPageLinks, startRouteDiscovery, subscribeToPageFlowUpdates } from './client/graph'
import { resolvePreviewUrl, touchPreviewCache } from './client/preview'
import { PAGEFLOW_NAVIGATE_MESSAGE, PAGEFLOW_WHEEL_MESSAGE } from './shared/protocol'
import { forwardWheelToCanvas, PAGEFLOW_CANVAS_CONFIG, type PageFlowWheelInteraction } from './client/canvas'
import { waitForPreviewReady } from './client/snapshot'
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
  createPageSpatialIndex,
  getAutoPreviewPageId,
  getRenderablePages,
  getVisiblePageIds,
  layoutPages,
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
const previewMode = ref<PageFlowPreviewMode>('pc')
const thumbnailTier = ref<PageFlowThumbnailTier>('full')
const thumbnailResources = ref<Record<string, string>>({})
const settledTransform = ref<CanvasTransform>({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
const livePreviewId = ref<string>()
const livePreviewCacheIds = ref<string[]>([])
const routeMode = ref<PageFlowRouteMode>('history')
const capturePreviewId = ref<string>()
const canvas = ref<HTMLDivElement>()
const overlayWorld = ref<HTMLDivElement>()
let leafer: Leafer | undefined
let viewportFrame = 0
let viewportIdleTimer: ReturnType<typeof setTimeout> | undefined
let routeDiscoveryFrame: HTMLIFrameElement | undefined
let layoutWorker: Worker | undefined
let stopPageFlowUpdates: (() => void) | undefined
let layoutRequestId = 0
let pendingLinkScan: PageFlowPage[] | undefined
let scanningLinks = false
let linkScanSignature = ''
const scannedLinkPaths = new Set<string>()
const failedPreviewIds = new Set<string>()
const previewFrames = new Map<string, HTMLIFrameElement>()
const capturesInProgress = new Set<string>()
const pendingThumbnailRecords: PageFlowThumbnailManifest = {}
let captureBatchIds = new Set<string>()
let previewGeneration = 0
const MAX_MOUNTED_PREVIEWS = 96
const MAX_RENDERED_EDGES = MAX_MOUNTED_PREVIEWS * 4
const thumbnailResourceCache = new ThumbnailResourceCache(160)
let thumbnailResourceGeneration = 0
const currentPreviewMode = computed(() => previewModes[previewMode.value])
const cardHeights = computed(() => new Map(pages.value.map(page => [page.id, pageCardHeight(page.id)])))
const positions = ref(layoutPages(pages.value, cardHeights.value))
const spatialIndex = computed(() => createPageSpatialIndex(pages.value, positions.value, cardHeights.value))
const renderedPages = computed(() => getRenderablePages(
  pages.value,
  visiblePageIds.value,
  [...livePreviewCacheIds.value, capturePreviewId.value],
  MAX_MOUNTED_PREVIEWS,
))
const requiredThumbnailRecords = computed(() => renderedPages.value.flatMap(page => pageThumbnailTiles(page)))

function compactThumbnailRecord(pageId: string) {
  return thumbnailManifest.value[thumbnailSlot(pageId, previewMode.value, 'compact')]
}

function fullThumbnailRecords(pageId: string) {
  return fullThumbnailTiles(thumbnailManifest.value, pageId, previewMode.value)
}

function thumbnailIsCurrent(page: PageFlowPage) {
  const revision = thumbnailRevision(page)
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

function pageHasThumbnail(page: PageFlowPage) {
  return pageThumbnailTiles(page).some(record => thumbnailSource(record))
}

function thumbnailTileStyle(record: PageFlowThumbnailRecord) {
  const isTile = record.tileIndex != null
  return {
    position: 'absolute',
    top: `${record.tileTop ?? 0}px`,
    left: 0,
    width: '100%',
    height: `${isTile ? record.height : record.pageHeight ?? record.height}px`,
  }
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

function requestLayout(nextPages = pages.value) {
  const id = ++layoutRequestId
  const heights = cardHeights.value
  if (!layoutWorker || nextPages.length < 1000) {
    positions.value = layoutPages(nextPages, heights)
    draw()
    return
  }
  status.value = `Laying out ${nextPages.length} pages…`
  layoutWorker.postMessage({ id, pages: nextPages, cardHeights: [...heights] })
}

function previewUrl(path: string) {
  return resolvePreviewUrl(path, props.config, window.location.origin, routeMode.value)
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
  zoomPercent.value = Math.round(transform.scaleX * 100)
  if (!viewportInteracting.value) thumbnailTier.value = thumbnailTierForZoom(zoomPercent.value)
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
    MAX_MOUNTED_PREVIEWS,
    spatialIndex.value,
  )
  let sceneChanged = false
  if (nextVisible.size !== visiblePageIds.value.size || [...nextVisible].some(id => !visiblePageIds.value.has(id)))
  {
    visiblePageIds.value = nextVisible
    sceneChanged = true
  }
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
    sceneChanged = true
  }
  if (sceneChanged) renderCanvasScene()
  scheduleNextCapture()
}

function handleViewportTransform() {
  viewportInteracting.value = true
  if (!viewportFrame) viewportFrame = requestAnimationFrame(() => {
    viewportFrame = 0
    syncOverlay(false)
  })
  clearTimeout(viewportIdleTimer)
  viewportIdleTimer = setTimeout(() => {
    viewportInteracting.value = false
    syncOverlay()
  }, 120)
}

function shouldRenderPreview(pageId: string) {
  return props.config.previewPath !== '/'
    && (capturePreviewId.value === pageId || livePreviewCacheIds.value.includes(pageId))
}

function scheduleNextCapture() {
  if (!thumbnailManifestLoaded.value || capturePreviewId.value || viewportInteracting.value) return
  if (!captureBatchIds.size) {
    captureBatchIds = new Set(pages.value.flatMap(page =>
      visiblePageIds.value.has(page.id) && !thumbnailIsCurrent(page) && !failedPreviewIds.has(page.id)
        ? [page.id]
        : [],
    ))
  }
  capturePreviewId.value = captureBatchIds.values().next().value
  const pageId = capturePreviewId.value
  if (pageId) void nextTick(() => {
    const frame = previewFrames.get(pageId)
    if (frame?.contentDocument?.readyState === 'complete') void capturePreview(pageId, frame)
  })
}

function finishCapture(pageId: string) {
  captureBatchIds.delete(pageId)
  capturePreviewId.value = undefined
  if (!captureBatchIds.size && Object.keys(pendingThumbnailRecords).length) {
    thumbnailManifest.value = { ...thumbnailManifest.value, ...pendingThumbnailRecords }
    Object.keys(pendingThumbnailRecords).forEach(id => delete pendingThumbnailRecords[id])
    requestLayout()
  }
  scheduleNextCapture()
}

function activatePreview(pageId: string) {
  active.value = pageId
  livePreviewId.value = pageId
  livePreviewCacheIds.value = touchPreviewCache(livePreviewCacheIds.value, pageId)
  renderCanvasScene()
}

function setPreviewFrame(pageId: string, element: Element | null) {
  if (element instanceof HTMLIFrameElement) previewFrames.set(pageId, element)
  else previewFrames.delete(pageId)
}

async function capturePreview(pageId: string, frame: HTMLIFrameElement) {
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
    await waitForPreviewReady(frame)
    if (generation !== previewGeneration) return
    const body = frame.contentDocument?.body
    if (!body || !frame.isConnected) return
    const mode = currentPreviewMode.value
    const fullHeight = Math.max(body.scrollHeight, frame.contentDocument?.documentElement.scrollHeight ?? 0, mode.height)
    const snapshot = await html2canvas(body, {
      backgroundColor: '#fff',
      height: fullHeight,
      logging: false,
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
      revision: thumbnailRevision(page),
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
        revision: thumbnailRevision(page),
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
  } catch (error) {
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
  livePreviewId.value = undefined
  livePreviewCacheIds.value = []
  capturePreviewId.value = undefined
  captureBatchIds.clear()
  failedPreviewIds.clear()
  Object.keys(pendingThumbnailRecords).forEach(id => delete pendingThumbnailRecords[id])
  requestLayout()
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
  const target = pages.value.find(page => page.path === event.data.to)
  if (!target) return
  active.value = target.id
  renderCanvasScene()
}

function renderCanvasScene() {
  if (!leafer) return
  leafer.removeAll(true)
  const cardW = PAGE_CARD_WIDTH
  if (!pages.value.length) {
    if (canvas.value) {
      canvas.value.dataset.renderedPages = '0'
      canvas.value.dataset.renderedEdges = '0'
    }
    leafer.add(new Text({ x: 80, y: 90, text: 'Waiting for Vue Router…', fontSize: 20, fill: '#958d82' }))
    return
  }
  const scenePages = renderedPages.value
  let renderedEdges = 0
  scenePages.forEach(page => {
    const [x, y] = positions.value.get(page.id)!
    page.links.forEach((link, i) => {
      if (renderedEdges >= MAX_RENDERED_EDGES) return
      const target = positions.value.get(link.to)
      if (!target) return
      const [tx, ty] = target
      leafer.add(new Line({ x: x + cardW, y: y + Math.min(pagePreviewHeight(page.id) / 2, 120) + i * 12, points: [0, 0, tx - x - cardW, ty - y], stroke: '#b8b0a5', strokeWidth: 2, dash: [6, 5], endArrow: true }))
      renderedEdges++
    })
  })
  scenePages.forEach(page => {
    const [x, y] = positions.value.get(page.id)!
    const previewH = pagePreviewHeight(page.id)
    const cardH = pageCardHeight(page.id)
    const group = new Group({ x, y })
    group.add(new Rect({ width: cardW, height: cardH, fill: '#303336', shadow: { x: 0, y: 8, blur: 20, color: '#090a0b40' } }))
    group.add(new Rect({ width: cardW, height: previewH, fill: '#202224' }))
    group.add(new Text({ x: 0, y: previewH + 15, text: page.title, fontSize: 16, fill: page.id === active.value ? page.accent : '#f0f1f2', fontWeight: 'bold' }))
    group.add(new Text({ x: 0, y: previewH + 42, text: page.path, fontSize: 10, fill: '#969b9f' }))
    group.add(new Text({ x: 0, y: previewH + 69, text: `${page.links.length} hot zones`, fontSize: 10, fill: page.accent }))
    leafer.add(group)
  })
  if (canvas.value) {
    canvas.value.dataset.renderedPages = String(scenePages.length)
    canvas.value.dataset.renderedEdges = String(renderedEdges)
  }
}

function draw() {
  if (!canvas.value) return
  if (!leafer) {
    leafer = new Leafer({
      ...PAGEFLOW_CANVAS_CONFIG,
      view: canvas.value,
    })
    leafer.on(MoveEvent.MOVE, handleViewportTransform)
    leafer.on(ZoomEvent.ZOOM, handleViewportTransform)
  }
  renderCanvasScene()
  requestAnimationFrame(syncOverlay)
}

function applyGraph(nextPages: PageFlowPage[], nextRouteMode: PageFlowRouteMode) {
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
  requestLayout(nextPages)
  queueInitialLinkScan()
}

function applyPageUpdate(nextPage: PageFlowPage) {
  const index = pages.value.findIndex(page => page.id === nextPage.id)
  if (index < 0) return
  const nextPages = [...pages.value]
  nextPages[index] = nextPage
  pages.value = nextPages
  status.value = 'Routes synced'
  renderCanvasScene()
}

function queueInitialLinkScan() {
  const page = pages.value.find(item => item.id === active.value)
  if (page) queueLinkScan([page])
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
      await scanPageLinks(props.config, batch, routeMode.value)
    }
    scanningLinks = false
    status.value = 'Routes synced'
  })()
}

watch(requiredThumbnailRecords, records => {
  const generation = ++thumbnailResourceGeneration
  const urls = [...new Set(records.map(record => thumbnailUrl(props.config, record)))]
  void Promise.all(urls.map(async url => {
    try {
      return [url, await thumbnailResourceCache.load(url)] as const
    } catch {
      return undefined
    }
  })).then(resources => {
    if (generation !== thumbnailResourceGeneration) return
    thumbnailResources.value = Object.fromEntries(resources.filter(resource => resource != null))
    thumbnailResourceCache.trim(new Set(urls))
  })
}, { immediate: true })

onMounted(async () => {
  window.addEventListener('message', handlePreviewMessage)
  layoutWorker = new Worker(new URL('./client/layout.worker.ts', import.meta.url), { type: 'module' })
  layoutWorker.addEventListener('message', event => {
    if (event.data?.id !== layoutRequestId || !Array.isArray(event.data.positions)) return
    positions.value = new Map(event.data.positions)
    status.value = pages.value.length ? 'Routes synced' : status.value
    draw()
  })
  layoutWorker.addEventListener('error', () => {
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
  }

  stopPageFlowUpdates = subscribeToPageFlowUpdates(props.config, {
    graph: graph => applyGraph(graph.pages, graph.routeMode),
    page: applyPageUpdate,
  })
  try {
    const graph = await fetchPageFlowGraph(props.config)
    applyGraph(graph.pages, graph.routeMode)
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
  }
})

onUnmounted(() => {
  window.removeEventListener('message', handlePreviewMessage)
  cancelAnimationFrame(viewportFrame)
  clearTimeout(viewportIdleTimer)
  thumbnailResourceGeneration++
  thumbnailResourceCache.dispose()
  previewFrames.clear()
  routeDiscoveryFrame?.remove()
  stopPageFlowUpdates?.()
  layoutWorker?.terminate()
  leafer?.destroy()
})
</script>

<template>
  <main>
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
    <section class="workspace">
      <div ref="canvas" class="canvas"></div>
      <div class="preview-overlay" @wheel="handleOverlayWheel">
        <div ref="overlayWorld" class="preview-world">
          <div
            v-for="page in renderedPages"
            :key="page.id"
            class="page-preview"
            :style="{ left: `${pagePosition(page.id)[0] + PAGE_PREVIEW_INSET}px`, top: `${pagePosition(page.id)[1] + PAGE_PREVIEW_INSET}px`, height: `${pagePreviewHeight(page.id)}px` }"
            @click="activatePreview(page.id)"
          >
            <template v-for="tile in pageThumbnailTiles(page)" :key="tile.slot">
              <img
                v-if="thumbnailSource(tile)"
                :src="thumbnailSource(tile)"
                :alt="`${page.title} thumbnail`"
                :style="thumbnailTileStyle(tile)"
                decoding="async"
                draggable="false"
              >
            </template>
            <iframe
              v-if="shouldRenderPreview(page.id)"
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
                opacity: livePreviewId === page.id ? 1 : 0,
                pointerEvents: livePreviewId === page.id && !viewportInteracting ? 'auto' : 'none',
              }"
              tabindex="-1"
              @load="capturePreview(page.id, $event.currentTarget as HTMLIFrameElement)"
            ></iframe>
            <div v-if="!pageHasThumbnail(page) && livePreviewId !== page.id" class="demo-preview" :style="{ background: page.accent }"><b>{{ page.title }}</b><span>{{ page.path }}</span></div>
          </div>
        </div>
      </div>
    </section>
    <div class="zoom"><button type="button" @click="zoomCanvas('in')">+</button><span>{{ zoomPercent }}%</span><button type="button" @click="zoomCanvas('out')">−</button></div>
    <footer><span><i></i> {{ status }}</span><span>Last synced just now</span></footer>
  </main>
</template>
