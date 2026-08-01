# 頁面測試

PageFlow 可以把路由與單元、元件及端對端測試關聯起來，並從選中的頁面執行明確設定的指令。

## 自動關聯

當測試匯入頁面元件、遵循同名慣例，或在測試案例中導航到完整路由時，PageFlow 可以建立關聯，並顯示每個關聯的原因。

## 明確映射

自動關聯不明確時，請使用路由和檔案 glob。

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
})
```

## 測試指令

預設不會猜測或啟用任何指令。請明確設定每一種受支援的測試類型。

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

`{file}` 和 `{name}` 會替換成已索引的值。指令從專案根目錄以 `shell: false` 執行。預設逾時為 120 秒；`timeoutMs` 接受 1 秒到 30 分鐘。

## 結果

頁面面板顯示未知、執行中、通過、失敗、略過或已取消狀態。執行中的測試可以從 PageFlow 取消。測試輸出只屬於開發環境，絕不會包含在正式 bundle 中。
