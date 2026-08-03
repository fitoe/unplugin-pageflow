<script setup lang="ts">
import { computed } from 'vue'

export interface PageFlowTabItem {
  id?: string
  value?: string
  label: string
  badge?: number
}

const props = withDefaults(defineProps<{
  modelValue: string
  items: PageFlowTabItem[]
  variant?: 'header' | 'panel'
  renderContent?: boolean
  ariaLabel?: string
}>(), {
  variant: 'panel',
  renderContent: true,
  ariaLabel: 'PageFlow 面板',
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const tabs = computed(() => props.items.map(item => ({ ...item, key: item.value ?? item.id ?? item.label })))
</script>

<template>
  <div class="pageflow-tabs" :class="`pageflow-tabs-${variant}`">
    <nav class="pageflow-tab-list" :aria-label="ariaLabel">
      <button v-for="item in tabs" :key="item.key" type="button" :class="{ active: modelValue === item.key }" @click="emit('update:modelValue', item.key)">
        <span>{{ item.label }}</span><small v-if="item.badge !== undefined">{{ item.badge }}</small>
      </button>
    </nav>
    <div v-if="renderContent" class="pageflow-tab-content">
      <slot :name="modelValue" />
    </div>
  </div>
</template>

<style scoped>
.pageflow-tabs { min-width: 0; }
.pageflow-tab-list { display: flex; min-width: 0; }
.pageflow-tab-list button { display: flex; align-items: center; justify-content: center; gap: 5px; color: var(--pageflow-muted, #8e97a7); background: transparent; cursor: pointer; }
.pageflow-tab-list small { min-width: 18px; padding: 1px 5px; border-radius: 9px; background: var(--pageflow-surface-muted, #2a303a); font-size: 10px; text-align: center; }
.pageflow-tabs-header .pageflow-tab-list { height: 54px; }
.pageflow-tabs-header button { height: 100%; padding: 0 13px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; }
.pageflow-tabs-header button.active { color: var(--pageflow-text, white); border-bottom-color: #7b70ff; }
.pageflow-tabs-panel { height: 100%; display: flex; flex-direction: column; }
.pageflow-tabs-panel .pageflow-tab-list { flex: 0 0 auto; padding: 0 8px; border-bottom: 1px solid var(--pageflow-border, #2b3039); }
.pageflow-tabs-panel button { flex: 1; min-width: 0; padding: 10px 5px 8px; border: 0; border-bottom: 2px solid transparent; font-size: 12px; }
.pageflow-tabs-panel button.active { color: var(--pageflow-text, inherit); border-bottom-color: #3b82f6; }
.pageflow-tab-content { min-height: 0; flex: 1; overflow: auto; }
</style>
