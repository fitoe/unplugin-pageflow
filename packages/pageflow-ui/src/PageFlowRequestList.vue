<script setup lang="ts">
import { ref } from 'vue'
import { apiRequestKey } from '@pageflow/core/api'
import type { PageFlowApiRequest } from '@pageflow/core/types'
import PageFlowJsonTree from './PageFlowJsonTree.vue'

const props = withDefaults(defineProps<{
  requests: PageFlowApiRequest[]
  emptyText?: string
  label?: (request: PageFlowApiRequest) => string
}>(), { emptyText: '尚未捕获业务请求。' })
const expanded = ref(new Set<string>())

function toggle(request: PageFlowApiRequest) {
  const next = new Set(expanded.value)
  const key = apiRequestKey(request)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}
</script>

<template>
  <div class="pageflow-request-list">
    <article v-for="request in requests" :key="apiRequestKey(request)" class="pageflow-request">
      <button class="pageflow-request-summary" type="button" @click="toggle(request)">
        <slot name="summary" :request="request" :expanded="expanded.has(apiRequestKey(request))">
          <span class="pageflow-request-method">{{ request.method }}</span>
          <code>{{ props.label?.(request) ?? request.url }}</code>
          <span>{{ request.status }}</span>
          <span>{{ request.duration }}ms</span>
          <em v-if="(request.occurrences ?? 1) > 1">×{{ request.occurrences }}</em>
        </slot>
      </button>
      <div v-if="expanded.has(apiRequestKey(request))" class="pageflow-request-body">
        <slot name="body" :request="request">
          <PageFlowJsonTree v-if="request.body !== undefined" :data="request.body" />
          <p v-else>该响应没有可显示的 JSON。</p>
        </slot>
      </div>
    </article>
    <p v-if="!requests.length" class="pageflow-request-empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.pageflow-request-list { display: grid; gap: 7px; }
.pageflow-request { min-height: 42px; padding: 9px 12px; border: 1px solid var(--pageflow-border, #2b3039); border-radius: 9px; background: var(--pageflow-surface, #191c22); }
.pageflow-request-summary { width: 100%; display: grid; grid-template-columns: 55px minmax(120px, 1fr) 45px 65px 40px; align-items: center; gap: 8px; padding: 0; color: inherit; text-align: left; border: 0; background: transparent; cursor: pointer; }
.pageflow-request-summary code { min-width: 0; overflow: hidden; color: var(--pageflow-muted, #929baa); text-overflow: ellipsis; white-space: nowrap; }
.pageflow-request-method { color: #7c72f2; font-weight: 700; font-size: 11px; }
.pageflow-request-summary em { color: #f0b45b; font-style: normal; font-weight: 700; }
.pageflow-request-body { margin: 10px -2px 0; padding: 10px 0 0; overflow: auto; border-top: 1px solid var(--pageflow-border, #2b3039); }
.pageflow-request-body p { margin: 0; color: var(--pageflow-muted, #747d8c); }
.pageflow-request-empty { color: var(--pageflow-muted, #747d8c); text-align: center; padding: 48px 8px; }
</style>
