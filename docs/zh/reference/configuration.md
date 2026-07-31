# 配置

向 PageFlow 适配器传入选项：

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

## 配置项

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 在开发服务器中启用 PageFlow。 |
| `previewPath` | `/__unplugin-pageflow/` | 可视化地图使用的 URL。 |
| `appUrl` | `/` | 用于发现应用路由器的路由。 |
| `dynamicParams` | `{}` | 为动态路由参数提供示例值。 |
| `pageTests` | `{}` | 显式关联路由 glob 与测试文件 glob。 |
| `testCommands` | `{}` | 使用明确且不经过 shell 的命令，按测试类型启用测试执行。 |

## 页面测试

PageFlow 会自动关联以下测试：导入页面组件的测试、与页面同名的测试文件，以及测试用例中导航到完整路由的测试。对于无法明确判断的测试，可以手动映射：

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

`{file}` 和 `{name}` 会分别替换为索引到的测试文件和用例名称。命令从项目根目录运行，并设置 `shell: false`；PageFlow 默认不会猜测或启用任何测试命令。单个测试默认最多运行 120 秒，`timeoutMs` 可将限制设置为 1 秒至 30 分钟。

## 动态路由参数

PageFlow 需要具体参数值才能渲染 `/products/:id` 这样的路由：

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

请使用安全的本地或测试标识符。动态参数不会绕过应用的身份认证。

## 预览就绪信号

PageFlow 会等待字体和图片加载，并等待 DOM 进入稳定状态后再捕获页面。存在长时间异步任务的页面可以主动发送就绪信号：

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```

