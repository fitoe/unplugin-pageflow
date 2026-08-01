# 設定

將選項傳給 PageFlow 配接器：

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

## 選項

| 選項 | 預設值 | 說明 |
| --- | --- | --- |
| `enabled` | `true` | 在開發伺服器啟用 PageFlow。 |
| `previewPath` | `/__unplugin-pageflow/` | 視覺地圖使用的 URL。 |
| `appUrl` | `/` | 用來探索應用路由器的路由。 |
| `dynamicParams` | `{}` | 為動態路由參數提供範例值。 |
| `pageTests` | `{}` | 明確把路由 glob 與測試檔案 glob 關聯。 |
| `testCommands` | `{}` | 使用明確且不經 shell 的指令，啟用每種測試類型。 |

## 頁面測試

PageFlow 會自動關聯匯入頁面元件、使用同名測試檔案，或在測試案例中導航到完整路由的測試。不明確的測試可以手動映射：

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

`{file}` 和 `{name}` 會替換成已索引的測試檔案和案例名稱。指令從專案根目錄以 `shell: false` 執行；預設不會猜測或啟用任何測試指令。單個測試預設可以執行 120 秒，`timeoutMs` 可設定 1 秒到 30 分鐘。

PageFlow 將最新 500 筆測試結果儲存在 `.unplugin-pageflow/cache/test-results.json`。測試檔案內容變更會自動令先前結果失效。持久輸出限制為每個測試最後 20 KB；快取目錄應繼續由 Git 忽略。

## 動態路由參數

PageFlow 需要具體值，才能渲染 `/products/:id` 這類路由：

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': {
      id: 'demo-product',
    },
    '/users/:userId/orders/:orderId': {
      userId: 'alice',
      orderId: 'order-100',
    },
  },
})
```

請使用安全的本機或測試識別碼。動態參數不會繞過應用驗證。

## 預覽就緒

PageFlow 會在擷取頁面前等待字型、圖片和穩定的 DOM。包含長時間非同步工作的頁面可以明確發出就緒訊號：

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
