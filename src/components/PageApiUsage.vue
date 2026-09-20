<script setup lang="ts">
import { computed } from 'vue'
import type { PageFlowApiResult } from '../shared/types'
import type { PageFlowApiIssue } from '../client/api-diagnostics'
import ApiFieldTree from './ApiFieldTree.vue'
import { buildApiFieldTree } from '../client/api-field-tree'

const props = defineProps<{ results: PageFlowApiResult[], issues: PageFlowApiIssue[], pagePath?: string, previewPath: string, host?: boolean }>()
function apiPath(url: string) {
  try { return new URL(url, window.location.origin).pathname } catch { return url.split('?')[0] }
}
const requests = computed(() => props.results.map(result => ({
  result,
  nodes: buildApiFieldTree(result.fields),
  issues: props.issues.filter(issue => issue.resultId === result.id),
})))
</script>

<template>
  <div class="api-panel-list">
    <details v-for="request in requests" :key="request.result.id" class="border-b border-default py-3">
      <summary class="cursor-pointer text-xs" :title="request.result.url">
        <span class="font-semibold text-primary">{{ request.result.method }}</span>
        <strong class="ml-2 break-all">{{ apiPath(request.result.url) }}</strong>
        <span v-if="(request.result.occurrences ?? 1) > 1" class="ml-2 text-muted">×{{ request.result.occurrences }}</span>
        <span class="mt-1 block text-muted"><span :class="{ 'text-error': request.result.status >= 400 || !request.result.status }">{{ request.result.status || '失败' }}</span> · {{ request.result.duration }}ms</span>
      </summary>
      <div class="mt-3 overflow-auto">
        <ApiFieldTree v-if="request.nodes.length" :nodes="request.nodes" />
        <p v-else class="py-2 text-xs text-muted">未采集到响应字段</p>
      </div>
      <p v-for="issue in request.issues" :key="issue.id" class="mt-2 text-xs text-error">{{ issue.title }} · {{ issue.description }}</p>
    </details>
    <p v-if="!results.length" class="py-6 text-center text-sm text-muted">等待页面接口响应…</p>
  </div>
</template>
