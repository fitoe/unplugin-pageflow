<script setup lang="ts">
import { computed } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

type JsonData = InstanceType<typeof VueJsonPretty>['$props']['data']
const props = defineProps<{ data: unknown; deep?: number }>()
const jsonData = computed(() => props.data as JsonData)

function toggleNodeFromLabel(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element) || !target.closest('.vjs-key, .vjs-comment')) return
  const row = target.closest('.vjs-tree-node')
  // Delegate to the library's toggle so expansion state has a single owner.
  row?.querySelector<HTMLElement>('.vjs-carets')?.click()
}
</script>

<template>
  <VueJsonPretty
    class="pageflow-json-tree"
    :data="jsonData"
    :deep="deep"
    :indent="3"
    :show-length="true"
    :show-line="true"
    :show-double-quotes="false"
    :show-icon="true"
    :show-select-controller="false"
    :select-on-click-node="false"
    :render-node-actions="true"
    @click.capture="toggleNodeFromLabel"
  />
</template>

<style scoped>
.pageflow-json-tree :deep(.vjs-tree-node:has(.vjs-carets) .vjs-key),
.pageflow-json-tree :deep(.vjs-tree-node:has(.vjs-carets) .vjs-comment) {
  cursor: pointer;
}
</style>
