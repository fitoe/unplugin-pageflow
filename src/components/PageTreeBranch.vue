<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
// sortablejs does not ship declarations for its modular build.
// @ts-expect-error modular runtime entry
import Sortable from 'sortablejs/modular/sortable.core.esm.js'
import type { PageTreeGroupNode, PageTreeNode } from '../client/page-tree'

defineOptions({ name: 'PageTreeBranch' })
const props = defineProps<{ nodes: PageTreeNode[], parentKey: string, depth: number, expandedKeys: ReadonlySet<string>, activePageId?: string, activeGroupKey?: string, favoritePageIds?: ReadonlySet<string>, figmaPageIds?: ReadonlySet<string>, figmaUpdatedPageIds?: ReadonlySet<string> }>()
type TreePlacement = { key: string, parentKey: string, order: number }
type TreeMove = { placements: TreePlacement[], movedKey: string, sourceParentKey: string }
const emit = defineEmits<{ select: [string], selectGroup: [PageTreeGroupNode], toggleGroup: [PageTreeGroupNode], place: [TreeMove], editPageName: [string], pageContextMenu: [string, number, number] }>()
const container = ref<HTMLElement>()
let sortable: { destroy: () => void } | undefined
const placementKey = (node: PageTreeNode) => node.kind === 'page' ? node.path : node.key
function canMoveInto(parent: string, key?: string) {
  if (!key?.startsWith('group:')) return true
  const path = key.slice(6)
  return parent !== path && !parent.startsWith(`${path}/`)
}
const isVirtualCollection = (key: string) => key === 'group:__pageflow_recent__' || key === 'group:__pageflow_favorites__'
const isVirtualCollectionParent = (key: string) => key === '__pageflow_recent__' || key === '__pageflow_favorites__'
onMounted(() => {
  if (!container.value || isVirtualCollectionParent(props.parentKey)) return
  sortable = Sortable.create(container.value, {
    group: { name: 'page-tree', pull: true, put(to: { el: HTMLElement }, _from: unknown, dragged: HTMLElement) { return canMoveInto(to.el.dataset.parentKey ?? '', dragged.dataset.placementKey) } },
    animation: 150, forceFallback: true, fallbackOnBody: true, fallbackTolerance: 3,
    draggable: '.page-tree-item[data-sortable="true"]', handle: '.page-tree-drag-handle',
    ghostClass: 'is-sortable-ghost', chosenClass: 'is-sortable-chosen', dragClass: 'is-sortable-drag', fallbackClass: 'is-sortable-fallback',
    onStart() { document.documentElement.classList.add('is-page-tree-sorting') },
    onEnd(event: { item: HTMLElement, to: HTMLElement, newDraggableIndex?: number, newIndex?: number }) {
      document.documentElement.classList.remove('is-page-tree-sorting')
      const parent = event.to.dataset.parentKey
      const key = event.item.dataset.placementKey
      if (key && parent !== undefined && canMoveInto(parent, key)) {
        const siblings = [...event.to.children]
          .filter(element => element.classList.contains('page-tree-item'))
          .map(element => (element as HTMLElement).dataset.placementKey ?? '')
          .filter(sibling => sibling && sibling !== key)
        const order = Math.max(0, Math.min(event.newDraggableIndex ?? event.newIndex ?? siblings.length, siblings.length))
        siblings.splice(order, 0, key)
        emit('place', {
          movedKey: key,
          sourceParentKey: props.parentKey,
          placements: siblings.map((sibling, index) => ({ key: sibling, parentKey: parent, order: index })),
        })
      }
    },
    onUnchoose() { document.documentElement.classList.remove('is-page-tree-sorting') },
  })
})
onBeforeUnmount(() => sortable?.destroy())
</script>

<template>
  <div ref="container" class="page-tree-branch" :data-parent-key="parentKey">
    <div v-for="node in nodes" :key="node.key" class="page-tree-item" :data-placement-key="placementKey(node)" :data-sortable="!isVirtualCollection(node.key) && !isVirtualCollectionParent(node.parentKey)">
      <div v-if="node.kind === 'group'" class="page-tree-row is-group" :class="{ 'is-active': node.key === activeGroupKey }" role="treeitem" :aria-expanded="expandedKeys.has(node.key)" :data-group-key="node.key" :style="{ '--tree-depth': depth }">
        <button type="button" class="page-tree-toggle" @click="emit('toggleGroup', node)"><svg class="page-tree-chevron" viewBox="0 0 16 16"><path d="m6 3 5 5-5 5" /></svg></button>
        <span class="page-tree-drag-handle" :class="{ 'is-virtual': isVirtualCollection(node.key) }"><svg class="page-tree-page-icon" viewBox="0 0 16 16"><path v-if="node.key === 'group:__pageflow_favorites__'" d="m8 2 1.8 3.7 4.1.6-3 2.9.7 4.1L8 11.4l-3.6 1.9.7-4.1-3-2.9 4.1-.6z" /><path v-else-if="node.key === 'group:__pageflow_recent__'" d="M8 2.5a5.5 5.5 0 1 1-4.4 2.2M2.5 2.8v3.5H6M8 5v3.2l2.2 1.3" /><path v-else d="M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z" /></svg><svg v-if="!isVirtualCollection(node.key)" class="page-tree-grip-icon" viewBox="0 0 10 14"><circle cx="3" cy="3" r="1" /><circle cx="7" cy="3" r="1" /><circle cx="3" cy="7" r="1" /><circle cx="7" cy="7" r="1" /><circle cx="3" cy="11" r="1" /><circle cx="7" cy="11" r="1" /></svg></span>
        <button type="button" class="page-tree-group-link" @click="emit('selectGroup', node)"><span>{{ node.label }}</span><small>{{ node.pageCount }}</small></button>
      </div>
      <button v-else type="button" class="page-tree-row is-page" :class="{ 'is-active': node.pageId === activePageId, 'is-favorite': favoritePageIds?.has(node.pageId) }" :data-page-id="node.pageId" :style="{ '--tree-depth': depth }" :title="node.path" @click="emit('select', node.pageId)" @contextmenu="$event.preventDefault(); $event.stopPropagation(); emit('pageContextMenu', node.pageId, $event.clientX, $event.clientY)">
        <span class="page-tree-guide"></span><span class="page-tree-drag-handle" :class="{ 'is-virtual': isVirtualCollectionParent(node.parentKey) }"><svg class="page-tree-page-icon" viewBox="0 0 16 16"><path d="M4 2.5h5l3 3v8H4zM9 2.5v3h3" /></svg><svg v-if="!isVirtualCollectionParent(node.parentKey)" class="page-tree-grip-icon" viewBox="0 0 10 14"><circle cx="3" cy="3" r="1" /><circle cx="7" cy="3" r="1" /><circle cx="3" cy="7" r="1" /><circle cx="7" cy="7" r="1" /><circle cx="3" cy="11" r="1" /><circle cx="7" cy="11" r="1" /></svg></span>
        <span><span class="page-tree-title" @dblclick.stop="emit('editPageName', node.pageId)"><strong>{{ node.label }}</strong><svg v-if="figmaPageIds?.has(node.pageId)" class="figma-brand-icon page-tree-figma" :class="{ 'has-update': figmaUpdatedPageIds?.has(node.pageId) }" viewBox="0 0 10 15" aria-label="已绑定 Figma"><path fill="#f24e1e" d="M0 2.5A2.5 2.5 0 0 1 2.5 0H5v5H2.5A2.5 2.5 0 0 1 0 2.5Z"/><path fill="#ff7262" d="M5 0h2.5a2.5 2.5 0 0 1 0 5H5Z"/><path fill="#a259ff" d="M0 7.5A2.5 2.5 0 0 1 2.5 5H5v5H2.5A2.5 2.5 0 0 1 0 7.5Z"/><circle cx="7.5" cy="7.5" r="2.5" fill="#1abcfe"/><path fill="#0acf83" d="M0 12.5A2.5 2.5 0 0 1 2.5 10H5v2.5a2.5 2.5 0 0 1-5 0Z"/></svg><b v-if="favoritePageIds?.has(node.pageId)">★</b></span></span><em v-if="node.virtual">虚拟</em>
      </button>
      <PageTreeBranch v-if="node.kind === 'group' && expandedKeys.has(node.key)" :nodes="node.children" :parent-key="node.path.join('/')" :depth="depth + 1" :expanded-keys="expandedKeys" :active-page-id="activePageId" :active-group-key="activeGroupKey" :favorite-page-ids="favoritePageIds" :figma-page-ids="figmaPageIds" :figma-updated-page-ids="figmaUpdatedPageIds" @select="emit('select', $event)" @select-group="emit('selectGroup', $event)" @toggle-group="emit('toggleGroup', $event)" @place="emit('place', $event)" @edit-page-name="emit('editPageName', $event)" @page-context-menu="(id, x, y) => emit('pageContextMenu', id, x, y)" />
    </div>
  </div>
</template>
