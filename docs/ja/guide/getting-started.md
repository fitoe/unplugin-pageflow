# はじめに

PageFlow は、アプリケーションのルートと画面遷移を可視化する開発専用ツールです。

## 必要環境

- Node.js 20.19 以降
- 対応するフレームワーク連携
- 初期化時に書き込みを行うページでは、ローカルまたはテスト用データ

## インストール

```bash
pnpm add -D unplugin-pageflow
```

## Vite の設定

Vue Router を使う Vite アプリケーションの場合：

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

## PageFlow を開く

通常どおり開発サーバーを起動します。

```bash
pnpm dev
```

ターミナルにプレビュー URL が表示されます。

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

URL を開くとルートマップを閲覧できます。スクロールで拡大・縮小、ドラッグで移動し、ページを選択すると関連を確認できます。

## 次のステップ

- [他のフレームワーク連携を選ぶ](/ja/integrations/)
- [動的ルートパラメーターを設定する](/ja/reference/configuration#動的ルートパラメーター)
- [プレビューの制限と安全性を確認する](/ja/reference/limitations)
