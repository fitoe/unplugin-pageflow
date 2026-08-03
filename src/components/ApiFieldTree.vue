<script setup lang="ts">
import { computed } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import type { ApiFieldTreeNode } from '../client/api-field-tree'
import { apiFieldTreeData } from '../client/api-field-tree'

const props = defineProps<{ nodes: ApiFieldTreeNode[] }>()
const data = computed(() => apiFieldTreeData(props.nodes))
</script>

<template>
  <VueJsonPretty
    class="api-field-tree"
    :data="data"
    :deep="2"
    :indent="3"
    :show-length="true"
    :show-line="true"
    :show-double-quotes="false"
    :show-icon="true"
    :show-select-controller="false"
    :select-on-click-node="false"
    :render-node-actions="true"
  />
</template>
