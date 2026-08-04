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
      <button class="pageflow-request-summary" type="button" :aria-expanded="expanded.has(apiRequestKey(request))" @click="toggle(request)">
        <slot name="summary" :request="request" :expanded="expanded.has(apiRequestKey(request))">
          <span class="pageflow-request-method" :class="`method-${request.method.toLowerCase()}`">{{ request.method }}</span>
          <span class="pageflow-request-details">
            <span class="pageflow-request-title">
              <code>{{ props.label?.(request) ?? request.url }}</code>
              <em v-if="(request.occurrences ?? 1) > 1">×{{ request.occurrences }}</em>
            </span>
            <span class="pageflow-request-meta">
              {{ request.status }} · {{ request.duration }}ms<span v-if="request.lastIntervalMs != null"> · 最近间隔 {{ request.lastIntervalMs }}ms</span>
            </span>
          </span>
          <span class="pageflow-request-chevron" aria-hidden="true">⌄</span>
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
.pageflow-request-list { display: grid; }
.pageflow-request { min-height: 42px; border-bottom: 1px solid var(--pageflow-border, #2b3039); }
.pageflow-request-summary { width: 100%; display: grid; grid-template-columns: 55px minmax(0, 1fr) 16px; align-items: start; gap: 8px; padding: 10px 4px; color: inherit; text-align: left; border: 0; background: transparent; cursor: pointer; }
.pageflow-request-details { display: block; min-width: 0; }
.pageflow-request-title { display: flex; min-width: 0; align-items: center; gap: 6px; }
.pageflow-request-summary code { min-width: 0; flex: 1; overflow: hidden; color: inherit; text-overflow: ellipsis; white-space: nowrap; }
.pageflow-request-method { width: fit-content; padding: 2px 7px; color: #7c72f2; font-weight: 700; font-size: 11px; border-radius: 6px; background: color-mix(in srgb, #7c72f2 14%, transparent); }
.pageflow-request-method.method-get { color: #2ea66f; background: color-mix(in srgb, #2ea66f 14%, transparent); }
.pageflow-request-method.method-post { color: #3b82f6; background: color-mix(in srgb, #3b82f6 14%, transparent); }
.pageflow-request-method.method-put { color: #d99725; background: color-mix(in srgb, #d99725 14%, transparent); }
.pageflow-request-method.method-delete { color: #ef6a72; background: color-mix(in srgb, #ef6a72 14%, transparent); }
.pageflow-request-meta { display: block; margin-top: 3px; color: var(--pageflow-muted, #929baa); font-size: 12px; line-height: 16px; }
.pageflow-request-summary em { color: #f0b45b; font-style: normal; font-weight: 700; }
.pageflow-request-chevron { color: var(--pageflow-muted, #929baa); line-height: 18px; transition: transform 160ms ease; }
.pageflow-request-summary[aria-expanded="true"] .pageflow-request-chevron { transform: rotate(180deg); }
.pageflow-request-body { padding: 0 4px 10px 67px; overflow: auto; }
.pageflow-request-body p { margin: 0; color: var(--pageflow-muted, #747d8c); }
.pageflow-request-empty { color: var(--pageflow-muted, #747d8c); text-align: center; padding: 48px 8px; }
</style>
