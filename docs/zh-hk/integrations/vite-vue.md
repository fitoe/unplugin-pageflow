# Vite + Vue Router

Vite 配接器為 Vue Router 應用提供最直接的 PageFlow 整合。

## 安裝

```bash
pnpm add -D unplugin-pageflow
```

## 設定

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import PageFlow from 'unplugin-pageflow'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    PageFlow.vite(),
  ],
})
```

正常啟動 Vite，然後開啟終端機輸出的 PageFlow URL。

## 路由探索

開發執行階段讀取 `router.getRoutes()`。它識別 Vue Router 連結和字面量 `router.push()` 或 `router.replace()` 目標，再透過 Vite HMR 更新路由及連結變更。

## 動態路由

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## 頁面狀態

原生控制項和捲動位置可以自動還原。應用特定的 Vue 狀態請使用 [`definePageFlowState`](/zh-hk/guide/state)。

## 限制

- 計算出的目標只有在應用公開後才可用。
- 驗證來自目前瀏覽器工作階段。
- 初始化副作用仍會在預覽中執行。
