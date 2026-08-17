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
}>()
const emit = defineEmits<{
  select: [pageId: string]
}>()

const expandedKeys = ref(new Set<string>())
const groupKeys = computed(() => pageTreeGroupKeys(props.nodes))
const rows = computed(() => flattenPageTree(props.nodes, expandedKeys.value))

function expand(keys: string[]) {
  expandedKeys.value = new Set([...expandedKeys.value, ...keys])
}

watch(groupKeys, (keys, previous = []) => {
  const previousKeys = new Set(previous)
  expand(keys.filter(key => !previousKeys.has(key)))
}, { immediate: true })

watch(() => props.activePageId, async (pageId) => {
  if (!pageId) return
  expand(pageTreeAncestorKeys(props.nodes, pageId))
  await nextTick()
  if (typeof document === 'undefined') return
  const activeRow = [...document.querySelectorAll<HTMLElement>('.page-tree-panel [data-page-id]')]
    .find(element => element.dataset.pageId === pageId)
  activeRow?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}, { immediate: true })

function toggleGroup(node: PageTreeGroupNode, expanded?: boolean) {
  const next = new Set(expandedKeys.value)
  const shouldExpand = expanded ?? !next.has(node.key)
  if (shouldExpand) next.add(node.key)
  else next.delete(node.key)
  expandedKeys.value = next
}

function selectPage(node: PageTreePageNode) {
  emit('select', node.pageId)
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
  <section class="page-tree-panel" aria-label="页面树">
    <div class="page-tree-list" role="tree" aria-label="项目页面">
      <template v-for="row in rows" :key="row.node.key">
        <button
          v-if="row.node.kind === 'group'"
          type="button"
          class="page-tree-row is-group"
          role="treeitem"
          :aria-expanded="expandedKeys.has(row.node.key)"
          :style="{ '--tree-depth': row.depth }"
          @click="toggleGroup(row.node)"
          @keydown="handleGroupKeydown($event, row.node)"
        >
          <svg class="page-tree-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
          <svg class="page-tree-node-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z" /></svg>
          <span>{{ row.node.label }}</span>
          <small>{{ row.node.pageCount }}</small>
        </button>
        <button
          v-else
          type="button"
          class="page-tree-row is-page"
          :class="{ 'is-active': row.node.pageId === activePageId }"
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
            <strong>{{ row.node.label }}</strong>
            <small>{{ row.node.path }}</small>
          </span>
          <em v-if="row.node.virtual">虚拟</em>
        </button>
      </template>
      <div v-if="!rows.length" class="page-tree-empty">暂无页面</div>
    </div>
  </section>
</template>
