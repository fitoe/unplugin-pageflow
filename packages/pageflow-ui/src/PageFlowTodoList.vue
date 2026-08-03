<script setup lang="ts">
import type { PageFlowTodo } from '@pageflow/core/todos'

withDefaults(defineProps<{
  todos: PageFlowTodo[]
  draft: string
  placeholder?: string
  emptyText?: string
}>(), {
  placeholder: '新增待办…',
  emptyText: '暂无待办。',
})

const emit = defineEmits<{
  'update:draft': [value: string]
  add: []
  toggle: [id: string]
  remove: [id: string]
}>()
</script>

<template>
  <div class="pageflow-todos">
    <form class="pageflow-todo-entry" @submit.prevent="emit('add')">
      <input :value="draft" type="text" maxlength="240" :placeholder="placeholder" aria-label="添加待办" @input="emit('update:draft', ($event.target as HTMLInputElement).value)">
      <button type="submit" :disabled="!draft.trim()">添加</button>
    </form>
    <div v-if="todos.length" class="pageflow-todo-list">
      <div v-for="todo in todos" :key="todo.id" class="pageflow-todo-item">
        <input :id="`pageflow-todo-${todo.id}`" type="checkbox" :checked="todo.done" @change="emit('toggle', todo.id)">
        <label :for="`pageflow-todo-${todo.id}`" :class="{ done: todo.done }">{{ todo.text }}</label>
        <button type="button" aria-label="删除待办" title="删除待办" @click="emit('remove', todo.id)">×</button>
      </div>
    </div>
    <div v-else class="pageflow-todo-empty">{{ emptyText }}</div>
  </div>
</template>

<style scoped>
.pageflow-todos { height: 100%; overflow: auto; }
.pageflow-todo-entry { display: flex; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--pageflow-border, #2b3039); }
.pageflow-todo-entry input { min-width: 0; flex: 1; height: 32px; padding: 0 10px; border: 1px solid var(--pageflow-border, #343a45); border-radius: 6px; color: var(--pageflow-text, inherit); background: var(--pageflow-surface-muted, #181b21); font: inherit; outline: none; }
.pageflow-todo-entry button { border: 1px solid var(--pageflow-border, #303640); border-radius: 7px; padding: 5px 10px; color: inherit; background: var(--pageflow-surface-muted, #242933); cursor: pointer; }
.pageflow-todo-entry button:disabled { cursor: default; opacity: .45; }
.pageflow-todo-list { display: grid; gap: 2px; padding-top: 10px; }
.pageflow-todo-item { display: grid; grid-template-columns: 16px minmax(0, 1fr) 24px; gap: 8px; align-items: start; padding: 9px 6px; border-radius: 6px; }
.pageflow-todo-item:hover { background: var(--pageflow-surface-muted, #191c22); }
.pageflow-todo-item input { margin: 2px 0 0; accent-color: #645af0; }
.pageflow-todo-item label { color: var(--pageflow-text, inherit); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; cursor: pointer; }
.pageflow-todo-item label.done { color: var(--pageflow-muted, #747d8c); text-decoration: line-through; }
.pageflow-todo-item button { padding: 0; border: 0; color: var(--pageflow-muted, #747d8c); background: transparent; font-size: 17px; line-height: 18px; cursor: pointer; }
.pageflow-todo-empty { padding: 32px 8px; color: var(--pageflow-muted, #747d8c); text-align: center; }
</style>
