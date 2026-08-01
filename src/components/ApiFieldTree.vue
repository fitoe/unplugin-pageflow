<script setup lang="ts">
import { computed } from 'vue'
import UTree from '@nuxt/ui/components/Tree.vue'
import type { ApiFieldTreeNode } from '../client/api-field-tree'

const props = defineProps<{ nodes: ApiFieldTreeNode[] }>()

const defaultExpanded = computed(() => props.nodes.flatMap(node => [
  node.key,
  ...node.children.filter(child => child.children.length).map(child => child.key),
]))

function branchSummary(node: ApiFieldTreeNode) {
  const array = node.children.every(child => /^\[\d+\]$/.test(child.label))
  return `${array ? 'Array' : 'Object'}(${node.children.length})`
}

function displayValue(value: string | undefined) {
  return JSON.stringify(value ?? null)
}
</script>

<template>
  <UTree
    :items="nodes"
    :default-expanded="defaultExpanded"
    :get-key="node => node.key"
    :on-select="event => event.preventDefault()"
  >
    <template #item="{ item, expanded, handleToggle }">
      <span v-if="item.children.length" aria-hidden="true" @click.stop="handleToggle">{{ expanded ? '▾' : '▸' }}</span>
      <span>{{ item.label }}</span>
      <span>:</span>
      <span v-if="item.children.length">{{ branchSummary(item) }}</span>
      <span v-else>{{ displayValue(item.value) }}</span>
    </template>
  </UTree>
</template>
