# 页面状态恢复

PageFlow 会保留有用的预览状态，避免切换页面后界面总是回到初始状态。

## 自动恢复

支持的原生输入框、下拉框、复选框和滚动位置会被自动捕获并恢复。密码、文件和验证码输入框会被有意排除。

## 注册应用状态

复杂组件和框架状态可以通过 `definePageFlowState` 主动接入。

```ts
import { onUnmounted, ref } from 'vue'
import { definePageFlowState } from 'unplugin-pageflow/runtime-state'

const activeTab = ref('overview')
const selectedRole = ref('farmer')

const stop = definePageFlowState('page-options', {
  get: () => ({
    activeTab: activeTab.value,
    selectedRole: selectedRole.value,
  }),
  restore: (state) => {
    activeTab.value = state.activeTab
    selectedRole.value = state.selectedRole
  },
})

onUnmounted(stop)
```

状态键应保持稳定且不重复。`get` 只返回可序列化、非敏感的数据；`restore` 应能在页面挂载后安全执行。

## 隔离方式

状态和缓存预览按完整页面 URL 隔离，包括有业务含义的 Query、Hash 和 PageFlow 预览角色。

## 安全

不要注册密码、Token、验证码、私钥或客户敏感信息。页面状态恢复是开发工具能力，不是安全存储机制。

