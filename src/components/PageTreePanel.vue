<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { pageTreeAncestorKeys, pageTreeGroupKeys, type PageTreeGroupNode, type PageTreeNode } from '../client/page-tree'
import PageTreeBranch from './PageTreeBranch.vue'

const props = defineProps<{ nodes: PageTreeNode[], collapsedKeys?: string[], activePageId?: string, activeGroupPath?: string[], favoritePageIds?: ReadonlySet<string>, figmaPageIds?: ReadonlySet<string>, figmaUpdatedPageIds?: ReadonlySet<string>, refreshing?: boolean }>()
const emit = defineEmits<{ select: [string], selectGroup: [string[]], refresh: [], place: [{ placements: Array<{ key: string, parentKey: string, order: number }>, movedKey: string, sourceParentKey: string }], updateCollapsed: [string[]], editPageName: [string], pageContextMenu: [string, number, number] }>()
const expanded = ref(new Set<string>())
const collapsed = ref(new Set(props.collapsedKeys ?? []))
const panel = ref<HTMLElement>()
const groupKeys = computed(() => pageTreeGroupKeys(props.nodes))
const activeGroupKey = computed(() => props.activeGroupPath?.length ? `group:${props.activeGroupPath.join('/')}` : '')
const visibleExpanded = computed(() => new Set([...expanded.value].filter(key => !collapsed.value.has(key))))
function expand(keys: string[], reveal = false) {
  expanded.value = new Set([...expanded.value, ...keys])
  if (reveal) collapsed.value = new Set([...collapsed.value].filter(key => !keys.includes(key)))
}
function toggleGroup(node: PageTreeGroupNode) {
  expanded.value = new Set(expanded.value).add(node.key)
  const next = new Set(collapsed.value)
  if (visibleExpanded.value.has(node.key)) next.add(node.key)
  else next.delete(node.key)
  collapsed.value = next
  emit('updateCollapsed', [...next])
}
function selectGroup(node: PageTreeGroupNode) {
  if (node.navigable === false) toggleGroup(node)
  else emit('selectGroup', node.path)
}
async function reveal(selector: string) {
  await nextTick()
  panel.value?.querySelector<HTMLElement>(selector)?.scrollIntoView({ block: 'nearest' })
}
watch(groupKeys, (keys, previous = []) => {
  const old = new Set(previous)
  expand(keys.filter(key => !old.has(key)))
  const valid = new Set(keys)
  const next = new Set([...collapsed.value].filter(key => valid.has(key)))
  if (next.size !== collapsed.value.size) emit('updateCollapsed', [...next])
  collapsed.value = next
}, { immediate: true })
watch(() => props.collapsedKeys, keys => collapsed.value = new Set(keys ?? []))
watch([() => props.activePageId, () => props.nodes], ([id]) => {
  if (!id) return
  expand(pageTreeAncestorKeys(props.nodes, id), true)
  void reveal(`[data-page-id="${CSS.escape(id)}"]`)
}, { immediate: true, flush: 'post' })
watch([activeGroupKey, () => props.nodes], ([key]) => {
  if (!key) return
  const parts = key.slice(6).split('/')
  expand(parts.slice(0, -1).map((_, i) => `group:${parts.slice(0, i + 1).join('/')}`), true)
  void reveal(`[data-group-key="${CSS.escape(key)}"]`)
}, { immediate: true, flush: 'post' })
</script>

<template>
  <section ref="panel" class="page-tree-panel" aria-label="页面树">
    <div class="page-tree-list" role="tree">
      <PageTreeBranch v-if="nodes.length" :nodes="nodes" parent-key="" :depth="0" :expanded-keys="visibleExpanded" :active-page-id="activePageId" :active-group-key="activeGroupKey" :favorite-page-ids="favoritePageIds" :figma-page-ids="figmaPageIds" :figma-updated-page-ids="figmaUpdatedPageIds" @select="emit('select', $event)" @select-group="selectGroup" @toggle-group="toggleGroup" @place="emit('place', $event)" @edit-page-name="emit('editPageName', $event)" @page-context-menu="(id, x, y) => emit('pageContextMenu', id, x, y)" />
      <div v-else class="page-tree-empty"><span>暂无页面</span><button type="button" :disabled="refreshing" @click="emit('refresh')">{{ refreshing ? '刷新中…' : '刷新页面树' }}</button></div>
    </div>
  </section>
</template>
