<script setup lang="ts">
import { computed } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import type { ApiFieldTreeNode } from '../client/api-field-tree'

const props = defineProps<{ nodes: ApiFieldTreeNode[] }>()

function nodeValue(node: ApiFieldTreeNode): unknown {
  if (!node.children.length) return node.value
  const array = node.children.every(child => /^\[\d+\]$/.test(child.label))
  if (array) {
    return node.children.reduce<unknown[]>((values, child) => {
      values[Number(child.label.slice(1, -1))] = nodeValue(child)
      return values
    }, [])
  }
  return Object.fromEntries(node.children.map(child => [child.label, nodeValue(child)]))
}

const data = computed(() => Object.fromEntries(props.nodes.map(node => [node.label, nodeValue(node)])))
</script>

<template>
  <VueJsonPretty
    class="api-json-tree"
    :data="data"
    :deep="2"
    :show-double-quotes="false"
    :show-icon="true"
    :show-length="true"
  />
</template>
