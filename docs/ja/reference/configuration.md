# 設定

PageFlow アダプターへオプションを渡します。

```ts
PageFlow.vite({
  enabled: true,
  previewPath: '/__unplugin-pageflow/',
  appUrl: '/',
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## オプション

| オプション | 既定値 | 説明 |
| --- | --- | --- |
| `enabled` | `true` | 開発サーバーで PageFlow を有効化。 |
| `previewPath` | `/__unplugin-pageflow/` | ビジュアルマップの URL。 |
| `appUrl` | `/` | アプリケーションルーターを検出するルート。 |
| `dynamicParams` | `{}` | 動的ルートパラメーターのサンプル値。 |
| `pageTests` | `{}` | ルート glob とテストファイル glob を関連付け。 |
| `testCommands` | `{}` | テスト種別ごとの shell を使わないコマンドを有効化。 |

## ページテスト

ページを import する、同名のテストファイルを使う、または完全なルートへ遷移するテストを自動関連付けします。曖昧な場合は明示できます。

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
  testCommands: {
    unit: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    component: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    e2e: { command: 'pnpm', args: ['playwright', 'test', '{file}', '-g', '{name}'], timeoutMs: 180_000 },
  },
})
```

`{file}` と `{name}` はテストファイルとケース名に置換されます。コマンドはプロジェクトルートで `shell: false` として実行され、既定では何も推測・有効化しません。既定タイムアウトは 120 秒、`timeoutMs` は 1 秒から 30 分です。

最新 500 件の結果は `.unplugin-pageflow/cache/test-results.json` に保存します。テストファイルの変更で以前の結果は無効になり、出力はテストごとに最後の 20 KB に制限されます。

## 動的ルートパラメーター

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
    '/users/:userId/orders/:orderId': {
      userId: 'alice',
      orderId: 'order-100',
    },
  },
})
```

安全なローカルまたはテスト用識別子を使います。動的パラメーターは認証を回避しません。

## プレビューの準備完了

PageFlow はフォント、画像、DOM の安定を待ちます。長い非同期処理があるページは明示的に通知できます。

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
