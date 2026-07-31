<script setup lang="ts">
import type { ApiFieldTreeNode } from '../client/api-field-tree'

withDefaults(defineProps<{
  nodes: ApiFieldTreeNode[]
  depth?: number
}>(), { depth: 0 })
</script>

<template>
  <div class="api-tree" role="tree">
    <template v-for="node in nodes" :key="node.key">
      <details v-if="node.children.length" class="api-tree-branch" :class="{ unused: !node.used }" :open="depth === 0">
        <summary>
          <code>{{ node.label }}</code>
          <span>{{ node.children.length }} 项</span>
        </summary>
        <ApiFieldTree :nodes="node.children" :depth="depth + 1" />
      </details>
      <div v-else class="api-tree-leaf" :class="{ unused: !node.used }" role="treeitem">
        <code>{{ node.label }}</code>
        <span>{{ node.value }}</span>
      </div>
    </template>
  </div>
</template>
