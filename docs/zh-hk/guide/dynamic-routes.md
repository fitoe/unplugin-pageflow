# 動態路由

在 PageFlow 知道 `id` 的安全值之前，無法渲染 `/products/:id` 這類路由。使用 `dynamicParams` 設定具有代表性的值。

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

## 匹配方式

使用框架配接器提供的路由模式作為物件鍵。路由模式要求的每個命名參數都應提供值。

## 查詢字串與雜湊

PageFlow 會把探索到的查詢字串和雜湊保留為導航位置。在底層路由不變時，它們可以表示分頁、篩選條件或錨點。

```text
/products/demo-product?tab=history#activity
```

## 選擇範例值

使用由本機 fixture 或測試資料支援的穩定識別碼。避免使用正式環境的客戶 ID，也不要選擇初始化時可能執行不可逆寫入的頁面。

動態參數只負責組合 URL，不會繞過驗證、授權、loader 或應用驗證邏輯。

## 故障排查

如果動態頁面仍無法渲染：

1. 確認設定的鍵與框架路由模式完全一致。
2. 提供所有必要參數。
3. 在同一瀏覽器工作階段直接開啟產生的 URL。
4. 檢查驗證或 loader 是否重新導向了請求。
