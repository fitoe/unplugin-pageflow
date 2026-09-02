<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useSortable } from '@vueuse/integrations/useSortable'
import {
  flattenPageTree,
  pageTreeAncestorKeys,
  pageTreeGroupKeys,
  type PageTreeGroupNode,
  type PageTreeNode,
  type PageTreePageNode,
} from '../client/page-tree'

const props = defineProps<{
  nodes: PageTreeNode[]
  activePageId?: string
  activeGroupPath?: string[]
  favoritePageIds?: ReadonlySet<string>
  figmaPageIds?: ReadonlySet<string>
  figmaUpdatedPageIds?: ReadonlySet<string>
  refreshing?: boolean
}>()
const emit = defineEmits<{
  select: [pageId: string]
  selectGroup: [path: string[]]
  refresh: []
  place: [key: string, parentKey: string, order: number]
  editPageName: [pageId: string]
  pageContextMenu: [pageId: string, x: number, y: number]
}>()

const expandedKeys = ref(new Set<string>())
const collapsedKeys = ref(new Set<string>())
const panel = ref<HTMLElement>()
const list = ref<HTMLElement>()
const groupKeys = computed(() => pageTreeGroupKeys(props.nodes))
const activeGroupKey = computed(() => props.activeGroupPath?.length ? `group:${props.activeGroupPath.join('/')}` : '')
const visibleExpandedKeys = computed(() => new Set(
  [...expandedKeys.value].filter(key => !collapsedKeys.value.has(key)),
))
const rows = computed(() => flattenPageTree(props.nodes, visibleExpandedKeys.value))
const sortableState = ref<string[]>([])
let dragTargetParentKey: string | undefined
let dragTargetOrder = 0
let dragPointerY = 0
let insertionTarget: HTMLElement | undefined
let draggedGroupPath: string | undefined
function clearInsertionTarget() {
  insertionTarget?.classList.remove('is-drop-before', 'is-drop-after', 'is-drop-inside')
  insertionTarget = undefined
}
useSortable(list, sortableState, {
  animation: 150,
  forceFallback: true,
  fallbackOnBody: true,
  fallbackTolerance: 3,
  draggable: '.page-tree-row',
  handle: '.page-tree-drag-handle',
  ghostClass: 'is-sortable-ghost',
  chosenClass: 'is-sortable-chosen',
  dragClass: 'is-sortable-drag',
  fallbackClass: 'is-sortable-fallback',
  onStart(event) {
    dragTargetParentKey = undefined
    dragTargetOrder = 0
    draggedGroupPath = (event.item as HTMLElement).dataset.groupKey?.replace(/^group:/, '')
    document.documentElement.classList.add('is-page-tree-sorting')
  },
  onMove(event) {
    const related = event.related as HTMLElement
    const groupKey = related.dataset.groupKey?.replace(/^group:/, '')
    const rect = related.getBoundingClientRect()
    const relativeY = dragPointerY ? (dragPointerY - rect.top) / Math.max(1, rect.height) : (event.willInsertAfter ? 1 : 0)
    const dropInsideGroup = groupKey !== undefined && relativeY >= .25 && relativeY <= .75
    dragTargetParentKey = dropInsideGroup ? groupKey : related.dataset.parentKey
    clearInsertionTarget()
    if (dragTargetParentKey === undefined) return false
    if (draggedGroupPath && (dragTargetParentKey === draggedGroupPath || dragTargetParentKey.startsWith(`${draggedGroupPath}/`))) return false
    const siblings = [...(list.value?.querySelectorAll<HTMLElement>('.page-tree-row[data-parent-key]') ?? [])]
      .filter(element => element !== event.dragged && element.dataset.parentKey === dragTargetParentKey)
    const relatedIndex = siblings.indexOf(related)
    dragTargetOrder = dropInsideGroup ? 0 : Math.max(0, relatedIndex + (relativeY > .5 ? 1 : 0))
    insertionTarget = related
    related.classList.add(dropInsideGroup ? 'is-drop-inside' : relativeY > .5 ? 'is-drop-after' : 'is-drop-before')
    return true
  },
  onEnd(event) {
    const item = event.item as HTMLElement
    const sourceParentKey = item.dataset.parentKey
    const key = item.dataset.pagePath ?? item.dataset.groupKey
    const parentKey = dragTargetParentKey ?? sourceParentKey
    if (key && parentKey !== undefined) {
      emit('place', key, parentKey, dragTargetOrder)
    }
    clearInsertionTarget()
    document.documentElement.classList.remove('is-page-tree-sorting')
    dragTargetParentKey = undefined
    dragTargetOrder = 0
    draggedGroupPath = undefined
  },
  onUnchoose() {
    clearInsertionTarget()
    document.documentElement.classList.remove('is-page-tree-sorting')
  },
})

function expand(keys: string[], reveal = false) {
  expandedKeys.value = new Set([...expandedKeys.value, ...keys])
  if (reveal) collapsedKeys.value = new Set([...collapsedKeys.value].filter(key => !keys.includes(key)))
}

function trackDragPointer(event: PointerEvent) {
  dragPointerY = event.clientY
}

watch(groupKeys, (keys, previous = []) => {
  const previousKeys = new Set(previous)
  expand(keys.filter(key => !previousKeys.has(key)))
}, { immediate: true })

async function scrollActivePageIntoView(pageId = props.activePageId) {
  if (!pageId) return
  await nextTick()
  const activeRow = [...(panel.value?.querySelectorAll<HTMLElement>('[data-page-id]') ?? [])]
    .find(element => element.dataset.pageId === pageId)
  activeRow?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

watch([() => props.activePageId, () => props.nodes], ([pageId]) => {
  if (!pageId) return
  expand(pageTreeAncestorKeys(props.nodes, pageId), true)
  void scrollActivePageIntoView(pageId)
}, { immediate: true, flush: 'post' })

watch([activeGroupKey, () => props.nodes], async ([groupKey]) => {
  if (!groupKey) return
  const segments = groupKey.slice('group:'.length).split('/')
  expand(segments.slice(0, -1).map((_, index) => `group:${segments.slice(0, index + 1).join('/')}`), true)
  await nextTick()
  const activeRow = [...(panel.value?.querySelectorAll<HTMLElement>('[data-group-key]') ?? [])]
    .find(element => element.dataset.groupKey === groupKey)
  activeRow?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}, { immediate: true, flush: 'post' })

function toggleGroup(node: PageTreeGroupNode, expanded?: boolean) {
  const shouldExpand = expanded ?? !visibleExpandedKeys.value.has(node.key)
  expandedKeys.value = new Set(expandedKeys.value).add(node.key)
  const nextCollapsed = new Set(collapsedKeys.value)
  if (shouldExpand) nextCollapsed.delete(node.key)
  else nextCollapsed.add(node.key)
  collapsedKeys.value = nextCollapsed
}

function selectPage(node: PageTreePageNode) {
  emit('select', node.pageId)
}

function selectGroup(node: PageTreeGroupNode) {
  if (node.navigable === false) toggleGroup(node)
  else emit('selectGroup', node.path)
}

function handleGroupKeydown(event: KeyboardEvent, node: PageTreeGroupNode) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    toggleGroup(node, true)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    toggleGroup(node, false)
  }
}
</script>

<template>
  <section ref="panel" class="page-tree-panel" aria-label="页面树" @pointermove.capture="trackDragPointer">
    <div ref="list" class="page-tree-list" role="tree" aria-label="项目页面">
      <template v-for="row in rows" :key="row.node.key">
        <div
          v-if="row.node.kind === 'group'"
          class="page-tree-row is-group"
          :class="{ 'is-active': row.node.key === activeGroupKey }"
          role="treeitem"
          :aria-expanded="visibleExpandedKeys.has(row.node.key)"
          :aria-current="row.node.key === activeGroupKey ? 'location' : undefined"
          :data-group-key="row.node.key"
          :data-parent-key="row.node.parentKey"
          :style="{ '--tree-depth': row.depth }"
        >
          <button
            type="button"
            class="page-tree-toggle"
            :aria-label="visibleExpandedKeys.has(row.node.key) ? `折叠${row.node.label}` : `展开${row.node.label}`"
            @click="toggleGroup(row.node)"
          >
            <svg class="page-tree-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
          </button>
          <span class="page-tree-drag-handle page-tree-group-drag-handle" title="拖动目录" aria-hidden="true">
            <svg class="page-tree-page-icon" viewBox="0 0 16 16"><path d="M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z" /></svg>
            <svg class="page-tree-grip-icon" viewBox="0 0 10 14"><circle cx="3" cy="3" r="1" /><circle cx="7" cy="3" r="1" /><circle cx="3" cy="7" r="1" /><circle cx="7" cy="7" r="1" /><circle cx="3" cy="11" r="1" /><circle cx="7" cy="11" r="1" /></svg>
          </span>
          <button
            type="button"
            class="page-tree-group-link"
            @click="selectGroup(row.node)"
            @keydown="handleGroupKeydown($event, row.node)"
          >
            <span>{{ row.node.label }}</span>
            <small>{{ row.node.pageCount }}</small>
          </button>
        </div>
        <button
          v-else
          type="button"
          class="page-tree-row is-page"
          :class="{
            'is-active': row.node.pageId === activePageId,
            'is-favorite': favoritePageIds?.has(row.node.pageId),
          }"
          role="treeitem"
          :data-page-id="row.node.pageId"
          :data-page-path="row.node.path"
          :data-parent-key="row.node.parentKey"
          :data-sortable="row.node.parentKey !== '__pageflow_orphans__'"
          :aria-current="row.node.pageId === activePageId ? 'page' : undefined"
          :style="{ '--tree-depth': row.depth }"
          :title="row.node.path"
          @click="selectPage(row.node)"
          @contextmenu="row.node.virtual && ($event.preventDefault(), $event.stopPropagation(), emit('pageContextMenu', row.node.pageId, $event.clientX, $event.clientY))"
        >
          <span class="page-tree-guide"></span>
          <span
            v-if="row.node.parentKey !== '__pageflow_orphans__'"
            class="page-tree-drag-handle"
            title="拖动排序"
            aria-hidden="true"
          >
            <svg class="page-tree-page-icon" viewBox="0 0 16 16"><path d="M4 2.5h5l3 3v8H4zM9 2.5v3h3" /></svg>
            <svg class="page-tree-grip-icon" viewBox="0 0 10 14"><circle cx="3" cy="3" r="1" /><circle cx="7" cy="3" r="1" /><circle cx="3" cy="7" r="1" /><circle cx="7" cy="7" r="1" /><circle cx="3" cy="11" r="1" /><circle cx="7" cy="11" r="1" /></svg>
          </span>
          <svg v-else class="page-tree-node-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h5l3 3v8H4zM9 2.5v3h3" /></svg>
          <span>
            <span class="page-tree-title" title="双击修改页面标题" @dblclick.stop="emit('editPageName', row.node.pageId)">
              <strong>{{ row.node.label }}</strong>
              <svg v-if="figmaPageIds?.has(row.node.pageId)" class="figma-brand-icon page-tree-figma" :class="{ 'has-update': figmaUpdatedPageIds?.has(row.node.pageId) }" viewBox="0 0 10 15" role="img" :aria-label="figmaUpdatedPageIds?.has(row.node.pageId) ? '绑定的 Figma 文件有更新' : '已绑定 Figma'">
                <path fill="#f24e1e" d="M0 2.5A2.5 2.5 0 0 1 2.5 0H5v5H2.5A2.5 2.5 0 0 1 0 2.5Z" />
                <path fill="#ff7262" d="M5 0h2.5a2.5 2.5 0 0 1 0 5H5Z" />
                <path fill="#a259ff" d="M0 7.5A2.5 2.5 0 0 1 2.5 5H5v5H2.5A2.5 2.5 0 0 1 0 7.5Z" />
                <circle cx="7.5" cy="7.5" r="2.5" fill="#1abcfe" />
                <path fill="#0acf83" d="M0 12.5A2.5 2.5 0 0 1 2.5 10H5v2.5a2.5 2.5 0 0 1-5 0Z" />
              </svg>
              <b v-if="favoritePageIds?.has(row.node.pageId)" aria-label="已收藏">★</b>
            </span>
          </span>
          <em v-if="row.node.virtual">虚拟</em>
        </button>
      </template>
      <div v-if="!rows.length" class="page-tree-empty">
        <span>暂无页面</span>
        <button type="button" :disabled="refreshing" @click="emit('refresh')">
          {{ refreshing ? '刷新中…' : '刷新页面树' }}
        </button>
      </div>
    </div>
  </section>
</template>
