<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
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
  favoritePageIds?: ReadonlySet<string>
  refreshing?: boolean
}>()
const emit = defineEmits<{
  select: [pageId: string]
  selectGroup: [path: string[]]
  refresh: []
}>()

const expandedKeys = ref(new Set<string>())
const collapsedKeys = ref(new Set<string>())
const panel = ref<HTMLElement>()
const groupKeys = computed(() => pageTreeGroupKeys(props.nodes))
const visibleExpandedKeys = computed(() => new Set(
  [...expandedKeys.value].filter(key => !collapsedKeys.value.has(key)),
))
const rows = computed(() => flattenPageTree(props.nodes, visibleExpandedKeys.value))

function expand(keys: string[], reveal = false) {
  expandedKeys.value = new Set([...expandedKeys.value, ...keys])
  if (reveal) collapsedKeys.value = new Set([...collapsedKeys.value].filter(key => !keys.includes(key)))
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
  <section ref="panel" class="page-tree-panel" aria-label="页面树">
    <div class="page-tree-list" role="tree" aria-label="项目页面">
      <template v-for="row in rows" :key="row.node.key">
        <div
          v-if="row.node.kind === 'group'"
          class="page-tree-row is-group"
          role="treeitem"
          :aria-expanded="visibleExpandedKeys.has(row.node.key)"
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
          <button
            type="button"
            class="page-tree-group-link"
            @click="selectGroup(row.node)"
            @keydown="handleGroupKeydown($event, row.node)"
          >
            <svg class="page-tree-node-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z" /></svg>
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
          :aria-current="row.node.pageId === activePageId ? 'page' : undefined"
          :style="{ '--tree-depth': row.depth }"
          :title="row.node.path"
          @click="selectPage(row.node)"
        >
          <span class="page-tree-guide"></span>
          <svg class="page-tree-node-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h5l3 3v8H4zM9 2.5v3h3" /></svg>
          <span>
            <span class="page-tree-title">
              <strong>{{ row.node.label }}</strong>
              <b v-if="favoritePageIds?.has(row.node.pageId)" aria-label="已收藏">★</b>
            </span>
            <small>{{ row.node.path }}</small>
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
