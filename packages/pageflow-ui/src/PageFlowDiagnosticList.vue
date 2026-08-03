<script setup lang="ts">
import type { PageFlowDiagnostic } from '@pageflow/core/types'

withDefaults(defineProps<{
  items: PageFlowDiagnostic[]
  emptyText?: string
  compact?: boolean
}>(), {
  emptyText: '未发现问题。',
  compact: false,
})
const emit = defineEmits<{ select: [item: PageFlowDiagnostic] }>()
</script>

<template>
  <div class="pageflow-diagnostic-list">
    <button
      v-for="(item, index) in items"
      :key="item.id"
      type="button"
      class="pageflow-diagnostic"
      :class="[item.severity, { compact }]"
      :disabled="!item.selector"
      @click="emit('select', item)"
    >
      <slot name="evidence" :item="item" />
      <span v-if="!compact" class="pageflow-diagnostic-dot" />
      <span class="pageflow-diagnostic-content">
        <b v-if="!compact">{{ item.title }}</b>
        <p v-if="!compact">{{ item.description }}</p>
        <code v-if="!compact && item.selector">{{ item.selector }}</code>
        <slot name="meta" :item="item" :index="index">
          <span v-if="compact" class="pageflow-diagnostic-meta">{{ item.targetLabel || `问题 ${index + 1}` }}</span>
        </slot>
      </span>
    </button>
    <p v-if="!items.length" class="pageflow-diagnostic-empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.pageflow-diagnostic-list { display: grid; gap: 7px; }
.pageflow-diagnostic { width: 100%; display: grid; grid-template-columns: 8px minmax(0, 1fr); align-items: start; gap: 8px; padding: 9px 12px; color: inherit; text-align: left; border: 1px solid var(--pageflow-border, #2b3039); border-radius: 9px; background: var(--pageflow-surface, #191c22); cursor: pointer; }
.pageflow-diagnostic:disabled { cursor: default; opacity: 1; }
.pageflow-diagnostic.compact { display: block; padding: 9px 6px; border: 0; border-radius: 0; background: transparent; }
.pageflow-diagnostic-dot { width: 7px; height: 7px; margin-top: 6px; border-radius: 50%; background: #e5ad54; }
.pageflow-diagnostic.error .pageflow-diagnostic-dot { background: #ef6a72; }
.pageflow-diagnostic.suggestion .pageflow-diagnostic-dot { background: #6ca7ee; }
.pageflow-diagnostic-content { min-width: 0; }
.pageflow-diagnostic-content b { display: block; }
.pageflow-diagnostic-content p { margin: 3px 0; color: var(--pageflow-muted, #929baa); }
.pageflow-diagnostic-content code { color: var(--pageflow-muted, #929baa); overflow-wrap: anywhere; }
.pageflow-diagnostic-meta { color: var(--pageflow-muted, #929baa); font-size: 12px; }
.pageflow-diagnostic-empty { color: var(--pageflow-muted, #747d8c); text-align: center; padding: 48px 8px; }
</style>
