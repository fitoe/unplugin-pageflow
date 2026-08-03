<script setup lang="ts">
import { computed } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

type JsonData = InstanceType<typeof VueJsonPretty>['$props']['data']
const props = defineProps<{ data: unknown; deep?: number }>()
const jsonData = computed(() => props.data as JsonData)
</script>

<template>
  <VueJsonPretty
    class="pageflow-json-tree"
    :data="jsonData"
    :deep="deep ?? 2"
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
