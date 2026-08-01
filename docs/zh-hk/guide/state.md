# 頁面狀態

PageFlow 會保留有用的預覽狀態，讓你查看其他頁面時不必每次都重設介面。

## 自動還原的狀態

受支援的原生輸入框、選擇器、核取方塊和捲動位置會自動擷取及還原。密碼、檔案和驗證碼欄位會刻意排除。

## 註冊應用狀態

複雜小工具和框架狀態可以透過 `definePageFlowState` 接入。

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

為每個狀態區塊使用穩定且唯一的鍵。`get` 應傳回可序列化的非敏感資料，`restore` 則應確保在頁面掛載後安全呼叫。

## 隔離

狀態與快取預覽會按完整頁面 URL（包括有意義的查詢字串和雜湊）以及預覽所使用的 PageFlow 角色隔離。

## 安全

切勿註冊密碼、Token、驗證碼、私密金鑰或客戶機密。請把註冊狀態視為開發工具資料，而不是安全儲存機制。
