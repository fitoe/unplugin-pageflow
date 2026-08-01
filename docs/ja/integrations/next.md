# Next.js

Next.js は Vite プラグイン面を公開しないため、PageFlow は開発専用の同一オリジン sidecar を使います。

## PageFlow を準備

開発依存としてインストールし、Next.js アプリケーションを起動します。

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## sidecar を起動

アプリケーションルートで CLI を実行します。

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

CLI は対応する Next.js ファイルルートを検出し、PageFlow URL を表示します。

## オプション

- `--dir`：Next.js プロジェクトディレクトリ
- `--host`：開発ホスト
- `--port`：sidecar が使う Next.js 開発ポート

## 開発専用

sidecar は `next build` の一部ではなく、本番サーバーでも使われません。ローカル開発スクリプトにだけ追加してください。

## トラブルシューティング

- ページプレビューを開く前に Next.js を起動します。
- 利用可能なホストとポートを使います。
- 同じブラウザーセッションでページを直接描画できるか確認します。
- ローカルまたはテスト用の認証とデータを使います。
