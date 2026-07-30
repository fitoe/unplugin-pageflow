<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Leafer, Rect, Text, Line, Group, MoveEvent, ZoomEvent } from 'leafer-ui'
import type { PageFlowPage, ResolvedPageFlowOptions } from './shared/types'
import { fetchPageFlowGraph, scanPageLinks, startRouteDiscovery, subscribeToGraphUpdates } from './client/graph'
import { resolvePreviewUrl } from './client/preview'
import { PAGEFLOW_NAVIGATE_MESSAGE } from './shared/protocol'
import {
  getVisiblePageIds,
  layoutPages,
  PAGE_CARD_HEIGHT,
  PAGE_CARD_WIDTH,
  PAGE_PREVIEW_INSET,
} from './client/layout'

const props = defineProps<{ config: ResolvedPageFlowOptions }>()

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
const canvas = ref<HTMLDivElement>()
const overlayWorld = ref<HTMLDivElement>()
let leafer: Leafer | undefined
let routeDiscoveryFrame: HTMLIFrameElement | undefined
let pendingLinkScan: PageFlowPage[] | undefined
let scanningLinks = false
let linkScanSignature = ''
const positions = computed(() => layoutPages(pages.value))

function pagePosition(pageId: string) {
  return positions.value.get(pageId) ?? [0, 0]
}

function previewUrl(path: string) {
  return resolvePreviewUrl(path, props.config)
}

function syncOverlay() {
  if (!leafer || !overlayWorld.value) return
  const layer = leafer.zoomLayer
  const transform = {
    x: layer.x ?? 0,
    y: layer.y ?? 0,
    scaleX: layer.scaleX ?? 1,
    scaleY: layer.scaleY ?? 1,
  }
  zoomPercent.value = Math.round(transform.scaleX * 100)
  overlayWorld.value.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scaleX}, ${transform.scaleY})`
  const nextVisible = getVisiblePageIds(
    pages.value,
    positions.value,
    { width: canvas.value?.clientWidth ?? 0, height: canvas.value?.clientHeight ?? 0 },
    transform,
  )
  if (nextVisible.size !== visiblePageIds.value.size || [...nextVisible].some(id => !visiblePageIds.value.has(id)))
    visiblePageIds.value = nextVisible
}

function zoomCanvas(direction: 'in' | 'out') {
  leafer?.zoom(direction)
  requestAnimationFrame(syncOverlay)
}

function handlePreviewNavigation(event: MessageEvent) {
  if (event.origin !== window.location.origin || event.data?.type !== PAGEFLOW_NAVIGATE_MESSAGE) return
  const target = pages.value.find(page => page.path === event.data.to)
  if (!target) return
  active.value = target.id
  draw()
}

function draw() {
  if (!canvas.value) return
  const previousTransform = leafer ? {
    x: leafer.zoomLayer.x,
    y: leafer.zoomLayer.y,
    scaleX: leafer.zoomLayer.scaleX,
    scaleY: leafer.zoomLayer.scaleY,
  } : undefined
  leafer?.destroy()
  canvas.value.innerHTML = ''
  leafer = new Leafer({
    view: canvas.value,
    zoom: 0.9,
    wheel: { zoomMode: true },
    move: { drag: true, dragEmpty: true },
  })
  leafer.on(MoveEvent.MOVE, syncOverlay)
  leafer.on(ZoomEvent.ZOOM, syncOverlay)
  if (previousTransform) Object.assign(leafer.zoomLayer, previousTransform)
  requestAnimationFrame(syncOverlay)
  const cardW = PAGE_CARD_WIDTH, cardH = PAGE_CARD_HEIGHT
  if (!pages.value.length) {
    leafer.add(new Text({ x: 80, y: 90, text: 'Waiting for Vue Router…', fontSize: 20, fill: '#958d82' }))
    return
  }
  pages.value.forEach(page => {
    const [x, y] = positions.value.get(page.id)!
    page.links.forEach((link, i) => {
      const target = positions.value.get(link.to)
      if (!target) return
      const [tx, ty] = target
      leafer.add(new Line({ x: x + cardW, y: y + 91 + i * 12, points: [0, 0, tx - x - cardW, ty - y], stroke: '#b8b0a5', strokeWidth: 2, dash: [6, 5], endArrow: true }))
    })
  })
  pages.value.forEach(page => {
    const [x, y] = positions.value.get(page.id)!
    const group = new Group({ x, y })
    group.add(new Rect({ width: cardW, height: cardH, fill: '#fffdf9', stroke: page.id === active.value ? page.accent : '#ded8ce', strokeWidth: page.id === active.value ? 3 : 1, cornerRadius: 16, shadow: { x: 0, y: 8, blur: 18, color: '#24201b18' } }))
    group.add(new Rect({ x: 16, y: 16, width: 208, height: 150, fill: '#f3efe8', stroke: page.accent, strokeWidth: 1, cornerRadius: 10 }))
    group.add(new Text({ x: 20, y: 184, text: page.title, fontSize: 18, fill: '#302c27', fontWeight: 'bold' }))
    group.add(new Text({ x: 20, y: 216, text: page.path, fontSize: 11, fill: '#958d82' }))
    group.add(new Text({ x: 20, y: 258, text: `${page.links.length} hot zones`, fontSize: 11, fill: page.accent }))
    leafer.add(group)
  })
}

function applyGraph(nextPages: PageFlowPage[]) {
  pages.value = nextPages
  if (!nextPages.some(page => page.id === active.value)) active.value = nextPages[0]?.id ?? ''
  status.value = nextPages.length ? 'Routes synced' : 'Waiting for Vue Router…'
  if (nextPages.length) {
    routeDiscoveryFrame?.remove()
    routeDiscoveryFrame = undefined
    queueLinkScan(nextPages)
  }
  draw()
}

function queueLinkScan(nextPages: PageFlowPage[]) {
  const signature = nextPages.map(page => page.path).join('\n')
  if (signature === linkScanSignature) return
  linkScanSignature = signature
  pendingLinkScan = nextPages
  if (scanningLinks) return
  scanningLinks = true
  void (async () => {
    while (pendingLinkScan) {
      const batch = pendingLinkScan
      pendingLinkScan = undefined
      status.value = `Scanning ${batch.length} page links…`
      await scanPageLinks(props.config, batch)
    }
    scanningLinks = false
    status.value = 'Routes synced'
  })()
}

onMounted(async () => {
  window.addEventListener('message', handlePreviewNavigation)
  draw()
  if (props.config.previewPath === '/') return

  subscribeToGraphUpdates(graph => applyGraph(graph.pages))
  try {
    const graph = await fetchPageFlowGraph(props.config)
    applyGraph(graph.pages)
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
  window.removeEventListener('message', handlePreviewNavigation)
  routeDiscoveryFrame?.remove()
  leafer?.destroy()
})
</script>

<template>
  <main>
    <header><div class="brand"><span>✦</span> unplugin-pageflow</div><div class="crumb">Untitled flow <span>/</span> {{ pages.length }} pages</div><span class="mode">DEV ONLY</span></header>
    <aside><div class="eyebrow">FLOW MAP</div><h1>See your product<br><em>in motion.</em></h1><p class="intro">A visual map of your interface. Every page, every path, one calm canvas.</p><div class="legend"><span class="dot orange"></span>Current page<span class="dot gray"></span>Connected page</div><div class="tip"><b>TIP</b><br>Scroll to zoom. Drag the canvas to explore.</div></aside>
    <section class="workspace">
      <div ref="canvas" class="canvas"></div>
      <div class="preview-overlay">
        <div ref="overlayWorld" class="preview-world">
          <div
            v-for="page in pages"
            :key="page.id"
            class="page-preview"
            :style="{ left: `${pagePosition(page.id)[0] + PAGE_PREVIEW_INSET}px`, top: `${pagePosition(page.id)[1] + PAGE_PREVIEW_INSET}px` }"
          >
            <iframe v-if="props.config.previewPath !== '/' && visiblePageIds.has(page.id)" :src="previewUrl(page.path)" :title="`${page.title} preview`" tabindex="-1"></iframe>
            <div v-else class="demo-preview" :style="{ background: page.accent }"><b>{{ page.title }}</b><span>{{ page.path }}</span></div>
          </div>
        </div>
      </div>
    </section>
    <div class="zoom"><button type="button" @click="zoomCanvas('in')">+</button><span>{{ zoomPercent }}%</span><button type="button" @click="zoomCanvas('out')">−</button></div>
    <footer><span><i></i> {{ status }}</span><span>Last synced just now</span></footer>
  </main>
</template>
