# 快速開始

PageFlow 是一張僅用於開發環境的視覺地圖，用來展示應用的路由和導航路徑。

## 環境要求

- Node.js 20.19 或更高版本
- 一個受支援的框架整合
- 對於初始化時會寫入資料的頁面，請使用本機或測試資料

## 安裝

```bash
pnpm add -D unplugin-pageflow
```

## 設定 Vite

對於使用 Vue Router 的 Vite 應用：

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

## 開啟 PageFlow

像平常一樣啟動開發伺服器：

```bash
pnpm dev
```

終端機會輸出預覽 URL：

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

開啟這個 URL 即可探索路由地圖。捲動縮放、拖動畫布移動，選擇頁面以查看它的關係。

## 下一步

- [選擇其他框架整合](/zh-hk/integrations/)
- [設定動態路由參數](/zh-hk/reference/configuration#動態路由參數)
- [查看預覽限制與安全注意事項](/zh-hk/reference/limitations)
