# 动态路由

`/products/:id` 这样的路由需要具体的 `id` 才能渲染。使用 `dynamicParams` 提供安全的示例值。

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

## 匹配规则

对象键应使用框架适配器暴露的路由模式。路由中每个必填参数都要提供对应值。

## Query 与 Hash

PageFlow 会保留发现到的 Query 和 Hash，用于表示标签页、筛选条件或页面锚点，同时底层路由仍保持不变。

```text
/products/demo-product?tab=history#activity
```

## 选择示例值

使用由本地 Fixture 或测试数据支持的稳定标识符。不要使用生产客户 ID，也不要选择初始化时会执行不可逆写操作的数据。

动态参数只负责构造 URL，不会绕过身份认证、权限、Loader 或业务校验。

## 排查步骤

1. 确认配置键与框架路由模式完全一致。
2. 为所有必填参数提供值。
3. 在同一浏览器会话中直接打开生成的 URL。
4. 检查身份认证或 Loader 是否发生重定向。

