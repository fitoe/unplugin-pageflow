# Vite + Vue Router

Vite アダプターは Vue Router アプリケーションに最も直接的な PageFlow 連携を提供します。

## インストール

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

通常どおり Vite を起動し、ターミナルに表示された PageFlow URL を開きます。

## ルート検出

開発ランタイムは `router.getRoutes()` を読み取ります。Vue Router のリンクとリテラルな `router.push()`、`router.replace()` の遷移先を認識し、Vite HMR で変更を更新します。

## 動的ルート

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## ページ状態

ネイティブ操作要素とスクロール位置は自動復元できます。アプリ固有の Vue 状態には [`definePageFlowState`](/ja/guide/state) を使います。

## 制限

- 計算される遷移先は、アプリが公開した後に利用できます。
- 認証は現在のブラウザーセッションを使います。
- 初期化時の副作用はプレビューでも実行されます。
