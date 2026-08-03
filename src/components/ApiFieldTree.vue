<script setup lang="ts">
import { computed } from 'vue'
import PageFlowJsonTree from '../../packages/pageflow-ui/src/PageFlowJsonTree.vue'
import type { ApiFieldTreeNode } from '../client/api-field-tree'
import { apiFieldTreeData } from '../client/api-field-tree'

const props = defineProps<{ nodes: ApiFieldTreeNode[] }>()
const data = computed(() => apiFieldTreeData(props.nodes))
</script>

<template>
  <PageFlowJsonTree
    class="api-field-tree"
    :data="data"
  />
</template>
