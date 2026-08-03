<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { PageFlowApiRequest as ApiRequest, PageFlowBrowserRuntimeEvent as RuntimeEvent, PageFlowDiagnostic as Diagnostic, PageFlowNavigationEdge, PageFlowPageSnapshot as PageSnapshot } from '@pageflow/core/types'
import type { PageFlowHost } from '@pageflow/core/host'
import { apiRequestKey } from '@pageflow/core/api'
import { addPageFlowTodo, removePageFlowTodo, togglePageFlowTodo, type PageFlowTodos } from '@pageflow/core/todos'
import PageFlowTodoList from './PageFlowTodoList.vue'
import PageFlowRequestList from './PageFlowRequestList.vue'
import PageFlowDiagnosticList from './PageFlowDiagnosticList.vue'
import PageFlowTabs from './PageFlowTabs.vue'
import { clearPageFlowCanvas, loadPageFlowCanvas, loadPageFlowTodos, savePageFlowCanvas, savePageFlowTodos } from '@pageflow/core/host-storage'

type Tab = 'pages' | 'requests' | 'diagnostics' | 'todo'
const props = defineProps<{ host?: PageFlowHost }>()
const host = props.host
const activeTab = ref<Tab>('pages')
const pages = ref<PageSnapshot[]>([])
const edges = ref<PageFlowNavigationEdge[]>([])
const requests = ref<ApiRequest[]>([])
const diagnostics = ref<Diagnostic[]>([])
const todosByPage = ref<PageFlowTodos>({})
const draft = ref('')
const screenshot = ref('')
const snapshots = ref<Record<string, string>>({})
const diagnosticsByPage = ref<Record<string, Diagnostic[]>>({})
const siteOrigin = ref('')
const sourceError = ref('')
const focusedPageUrl = ref('')
const currentPageUrl = ref('')
const canvasShell = ref<HTMLElement>()
const canvasZoom = ref(1)
const canvasOffset = ref({ x: 0, y: 0 })
const pageSearch = ref('')
let panStart: { x: number; y: number; offsetX: number; offsetY: number } | undefined
let captureTimer: number | undefined
let unsubscribe: (() => void) | undefined
const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'pages', label: '页面' }, { id: 'requests', label: '接口' }, { id: 'diagnostics', label: '诊断' }, { id: 'todo', label: 'Todo' },
]
const currentPageId = computed(() => currentPageUrl.value || pages.value.at(-1)?.url || '')
const todos = computed(() => todosByPage.value[currentPageId.value] ?? [])
const counts = computed<Record<Tab, number>>(() => ({ pages: pages.value.length, requests: requests.value.length, diagnostics: diagnostics.value.length, todo: todos.value.filter(todo => !todo.done).length }))
const canvasNodes = computed(() => pages.value.map((page, index) => ({
  page,
  x: 70 + (index % 3) * 330,
  y: 60 + Math.floor(index / 3) * 190,
})))
const canvasSize = computed(() => ({
  width: Math.max(900, 70 + Math.min(3, Math.max(1, pages.value.length)) * 330),
  height: Math.max(500, 100 + Math.ceil(Math.max(1, pages.value.length) / 3) * 190),
}))
const canvasEdges = computed(() => edges.value.flatMap((edge) => {
  const from = canvasNodes.value.find(node => node.page.url === edge.from)
  const to = canvasNodes.value.find(node => node.page.url === edge.to)
  return from && to ? [{ ...edge, x1: from.x + 250, y1: from.y + 55, x2: to.x, y2: to.y + 55 }] : []
}))
const matchingPages = computed(() => {
  const query = pageSearch.value.trim().toLowerCase()
  return query ? pages.value.filter(page => `${page.title} ${page.url}`.toLowerCase().includes(query)) : []
})

function mergeEvent(event: RuntimeEvent) {
  if (event.kind === 'page') {
    currentPageUrl.value = event.page.url
    pages.value = [...new Map([...pages.value, event.page].map(item => [item.url, item])).values()]
    if (!snapshots.value[event.page.url]) scheduleCapture(event.page.url)
  }
  if (event.kind === 'navigation') {
    edges.value = [...edges.value.filter(item => item.id !== event.edge.id), event.edge]
  }
  if (event.kind === 'request') {
    const key = apiRequestKey(event.request)
    requests.value = [event.request, ...requests.value.filter(item => apiRequestKey(item) !== key)].slice(0, 30)
  }
  if (event.kind === 'diagnostics') {
    diagnostics.value = event.diagnostics
    if (currentPageId.value) diagnosticsByPage.value = { ...diagnosticsByPage.value, [currentPageId.value]: event.diagnostics }
  }
  void saveCanvasState()
}

async function load() {
  if (!host) {
    sourceError.value = '未绑定业务页面，请从目标页面重新打开 PageFlow。'
    return
  }
  const state = await host.loadState().catch(() => undefined)
  if (!state) {
    sourceError.value = '原业务标签页已关闭，请从目标页面重新打开 PageFlow。'
    return
  }
  if (state.currentUrl) siteOrigin.value = new URL(state.currentUrl).origin
  if (siteOrigin.value) {
    const stored = await loadPageFlowCanvas<Partial<{
      pages: PageSnapshot[]; edges: PageFlowNavigationEdge[]; snapshots: Record<string, string>; diagnosticsByPage: Record<string, Diagnostic[]>
    }>>(host, siteOrigin.value)
    if (stored) {
      pages.value = storageArray<PageSnapshot>(stored.pages)
      edges.value = storageArray<PageFlowNavigationEdge>(stored.edges)
      snapshots.value = stored.snapshots ?? {}
      diagnosticsByPage.value = stored.diagnosticsByPage ?? {}
    }
  }
  currentPageUrl.value = state.currentUrl
  pages.value = [...new Map([...pages.value, ...state.pages].map(item => [item.url, item])).values()]
  edges.value = [...new Map([...edges.value, ...state.edges].map(item => [item.id, item])).values()]
  requests.value = state.requests
  diagnostics.value = state.diagnostics.length ? state.diagnostics : diagnosticsByPage.value[currentPageId.value] ?? []
  if (currentPageId.value && !snapshots.value[currentPageId.value]) scheduleCapture(currentPageId.value)
  todosByPage.value = await loadPageFlowTodos(host)
}

function scan() {
  activeTab.value = 'diagnostics'
  void host?.scan()
}

function highlightDiagnostic(item: Diagnostic) {
  if (!item.selector) return
  void host?.highlight(item.selector)
}

function openPage(url: string) {
  focusedPageUrl.value = url
  void host?.navigate(url)
}

function pagePath(url: string) {
  return new URL(url).pathname
}

function setCanvasZoom(value: number) {
  canvasZoom.value = Math.min(1.8, Math.max(0.45, Number(value.toFixed(2))))
}

function resetCanvasView() {
  canvasZoom.value = 1
  canvasOffset.value = { x: 0, y: 0 }
}

function focusCanvasPage(url = matchingPages.value[0]?.url) {
  if (!url) return
  const node = canvasNodes.value.find(item => item.page.url === url)
  const shell = canvasShell.value
  if (!node || !shell) return
  focusedPageUrl.value = url
  canvasOffset.value = {
    x: shell.clientWidth / 2 - (node.x + 125) * canvasZoom.value,
    y: shell.clientHeight / 2 - (node.y + 55) * canvasZoom.value,
  }
}

function startCanvasPan(event: PointerEvent) {
  if (event.target !== event.currentTarget && (event.target as Element).closest('.page-node, .canvas-toolbar')) return
  panStart = { x: event.clientX, y: event.clientY, offsetX: canvasOffset.value.x, offsetY: canvasOffset.value.y }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function moveCanvasPan(event: PointerEvent) {
  if (!panStart) return
  canvasOffset.value = { x: panStart.offsetX + event.clientX - panStart.x, y: panStart.offsetY + event.clientY - panStart.y }
}

function stopCanvasPan() {
  panStart = undefined
}

async function clearSiteCanvas() {
  if (siteOrigin.value) {
    if (host) await clearPageFlowCanvas(host, siteOrigin.value)
  }
  pages.value = currentPageUrl.value ? pages.value.filter(page => page.url === currentPageUrl.value) : []
  edges.value = []
  snapshots.value = {}
  diagnosticsByPage.value = {}
  resetCanvasView()
}

async function capture() {
  if (!host) return
  const image = await host.capture()
  screenshot.value = image
  if (currentPageId.value) {
    snapshots.value = limitSnapshots({ ...snapshots.value, [currentPageId.value]: image })
    await saveCanvasState()
  }
}

function limitSnapshots(value: Record<string, string>) {
  return Object.fromEntries(Object.entries(value).slice(-12))
}

function storageArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value
  return value && typeof value === 'object' ? Object.values(value) as T[] : []
}

function scheduleCapture(url: string) {
  window.clearTimeout(captureTimer)
  captureTimer = window.setTimeout(async () => {
    if (currentPageId.value !== url || snapshots.value[url]) return
    const image = await host?.capture().catch(() => '')
    if (!image) return
    snapshots.value = limitSnapshots({ ...snapshots.value, [url]: image })
    await saveCanvasState()
  }, 1_200)
}

async function saveCanvasState() {
  if (!siteOrigin.value) return
  if (!host) return
  await savePageFlowCanvas(host, siteOrigin.value, {
      pages: pages.value.map(page => ({ ...page })),
      edges: edges.value.map(edge => ({ ...edge })),
      snapshots: snapshots.value,
      diagnosticsByPage: Object.fromEntries(Object.entries(diagnosticsByPage.value).map(([url, items]) => [url, items.map(item => ({ ...item }))])),
      updatedAt: Date.now(),
  })
}

async function saveTodos() {
  if (host) await savePageFlowTodos(host, todosByPage.value)
}

function addTodo() {
  const value = draft.value.trim()
  if (!value) return
  if (!currentPageId.value) return
  todosByPage.value = addPageFlowTodo(todosByPage.value, currentPageId.value, value)
  draft.value = ''
  void saveTodos()
}

function toggleTodo(id: string) {
  todosByPage.value = togglePageFlowTodo(todosByPage.value, currentPageId.value, id)
  void saveTodos()
}

function removeTodo(id: string) {
  todosByPage.value = removePageFlowTodo(todosByPage.value, currentPageId.value, id)
  void saveTodos()
}

onMounted(() => {
  if (host) unsubscribe = host.subscribe(mergeEvent)
  void load()
})
onUnmounted(() => unsubscribe?.())
</script>

<template>
  <main>
    <header>
      <div><strong>PageFlow</strong><span>独立画板</span></div>
      <PageFlowTabs v-model="activeTab" :items="tabs.map(item => ({ ...item, badge: counts[item.id] }))" variant="header" :render-content="false" />
      <div class="actions"><button @click="capture">截图</button><button class="primary" @click="scan">扫描</button></div>
    </header>
    <div v-if="sourceError" class="source-error">{{ sourceError }}</div>

    <section v-if="!sourceError && activeTab === 'pages'" ref="canvasShell" class="canvas-shell" @pointerdown="startCanvasPan" @pointermove="moveCanvasPan" @pointerup="stopCanvasPan" @pointercancel="stopCanvasPan">
      <div class="canvas-toolbar">
        <form @submit.prevent="focusCanvasPage()"><input v-model="pageSearch" placeholder="搜索页面…"><button type="submit" :disabled="!matchingPages.length">定位</button></form>
        <button type="button" title="缩小" @click="setCanvasZoom(canvasZoom - 0.1)">−</button><span>{{ Math.round(canvasZoom * 100) }}%</span><button type="button" title="放大" @click="setCanvasZoom(canvasZoom + 0.1)">＋</button>
        <button type="button" @click="resetCanvasView">全图</button><button type="button" @click="clearSiteCanvas">清空</button>
      </div>
      <div v-if="pages.length" class="route-canvas" :style="{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px`, transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})` }">
        <svg :width="canvasSize.width" :height="canvasSize.height" aria-hidden="true">
          <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
          <g v-for="edge in canvasEdges" :key="edge.id">
            <path :d="`M${edge.x1},${edge.y1} C${edge.x1 + 45},${edge.y1} ${edge.x2 - 45},${edge.y2} ${edge.x2},${edge.y2}`" marker-end="url(#arrow)" />
            <text v-if="edge.occurrences > 1" :x="(edge.x1 + edge.x2) / 2" :y="(edge.y1 + edge.y2) / 2 - 7">×{{ edge.occurrences }}</text>
          </g>
        </svg>
        <button v-for="node in canvasNodes" :key="node.page.url" class="page-node" :class="{ focused: focusedPageUrl === node.page.url, snapshot: snapshots[node.page.url] }" :style="{ transform: `translate(${node.x}px, ${node.y}px)`, backgroundImage: snapshots[node.page.url] ? `linear-gradient(#11182755, #111827ee), url(${snapshots[node.page.url]})` : undefined }" @click="openPage(node.page.url)">
          <span class="node-kind">PAGE</span><b>{{ node.page.title || '未命名页面' }}</b><code>{{ pagePath(node.page.url) }}</code>
        </button>
      </div>
      <p v-else class="empty">刷新被检查页面后，路由会出现在这里。</p>
    </section>
    <section v-else-if="!sourceError && activeTab === 'requests'" class="list">
      <PageFlowRequestList :requests="requests" />
    </section>
    <section v-else-if="!sourceError && activeTab === 'diagnostics'" class="list diagnostics">
      <PageFlowDiagnosticList :items="diagnostics" empty-text="点击“扫描”检查当前页面。" @select="highlightDiagnostic" />
    </section>
    <section v-else-if="!sourceError" class="todos">
      <PageFlowTodoList v-model:draft="draft" :todos="todos" @add="addTodo" @toggle="toggleTodo" @remove="removeTodo" />
    </section>

    <aside v-if="screenshot"><button @click="screenshot = ''">关闭</button><img :src="screenshot" alt="当前页面截图"></aside>
  </main>
</template>
