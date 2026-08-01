# 互換性

PageFlow には Node.js 20.19 以降が必要です。開発依存としてインストールしてください。

| 連携 | 最小 peer バージョン | ルート情報 | 備考 |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5、Vue 3.4、Vue Router 4 | `router.getRoutes()` | 開発ランタイムを完全に連携。 |
| Nuxt | Nuxt 3 | Vue Router レコード | Nuxt/Vue の遷移イベントを認識。 |
| Astro | Astro 5 | ファイルルート | 同一オリジンのアンカーと `data-pageflow-to`。island 内部は対象外。 |
| React Router | ルートオブジェクト | 明示的なルートオブジェクト | `unplugin-pageflow/react-router` を使用。 |
| SvelteKit | SvelteKit 2 | ファイルルート | `sveltekit()` と合成。 |
| SolidStart | SolidStart | ファイルルート | Solid プラグインと合成。 |
| Qwik City | Qwik 1.10、Qwik City 1.10 | ファイルルート | Qwik City、Vite と合成。 |
| Next.js | Next.js 15 | ファイルルート | 開発用 `pageflow-next` sidecar を使用。 |
| uni-app | 現行 Vite ベース構成 | 生成ルート | 開発専用。 |

## ブラウザー要件

ページプレビューには、同一オリジンの iframe アクセスと、標準の履歴、メッセージング、キャンバスに対応するモダンブラウザーが必要です。

## 本番対応

PageFlow には意図的に本番ランタイムがありません。本番ビルドにクライアントや開発エンドポイントを含めないでください。

## バージョン方針

peer 範囲は対応する連携境界を示します。新しいメジャーバージョンを導入するときは package manifest と CI を確認してください。
