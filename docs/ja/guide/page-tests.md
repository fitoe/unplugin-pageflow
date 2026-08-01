# ページテスト

PageFlow はルートを単体、コンポーネント、E2E テストと関連付け、選択ページから明示的に設定したコマンドを実行できます。

## 自動関連付け

ページコンポーネントを import する、同名規則に従う、またはテスト内で完全なルートへ遷移する場合に関連付けられます。PageFlow は関連付けの理由も表示します。

## 明示的なマッピング

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## テストコマンド

コマンドは推測も既定有効化もされません。テスト種別ごとに明示的に設定します。

```ts
PageFlow.vite({
  testCommands: {
    unit: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    component: {
      command: 'pnpm',
      args: ['vitest', 'run', '{file}', '-t', '{name}'],
    },
    e2e: {
      command: 'pnpm',
      args: ['playwright', 'test', '{file}', '-g', '{name}'],
      timeoutMs: 180_000,
    },
  },
})
```

`{file}` と `{name}` はインデックス済みの値に置換されます。コマンドはプロジェクトルートで `shell: false` として実行されます。既定タイムアウトは 120 秒、`timeoutMs` は 1 秒から 30 分です。

## 結果

ページパネルには未確認、実行中、成功、失敗、スキップ、キャンセルを表示します。実行中のテストは PageFlow からキャンセルできます。テスト出力は本番バンドルに含まれません。
