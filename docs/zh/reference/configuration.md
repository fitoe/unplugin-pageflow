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
| `diagnostics` | 见下文 | 控制页面诊断阈值、忽略区域和规则开关。 |
| `apiDiagnostics` | 见下文 | 控制慢接口、大响应和重复请求阈值。 |

## 页面诊断

诊断配置可以写在插件选项或项目根目录 `.pageflow` 中：

```json
{
  "diagnostics": {
    "minimumFontSize": 12,
    "minimumTapSize": 44,
    "ignoreSelectors": [".third-party-widget", "[data-pageflow-ignore]"],
    "rules": {
      "missing-alt": false,
      "heading-order": false
    }
  }
}
```

- `minimumFontSize`：小字号建议的阈值，单位为 px，默认 `12`。
- `minimumTapSize`：点击区域警告的宽高阈值，单位为 px，默认 `44`。
- `ignoreSelectors`：忽略匹配元素及其后代；无效 selector 不会中断扫描。
- `rules`：按诊断结果中的 `ruleId` 开关规则，设为 `false` 时关闭。

`event-navigation` 规则会扫描 Vue 模板，仅将固定目标、没有其他副作用的 `@click` / `@tap` 跳转标记为建议。动态地址、带参数处理器或同时执行状态修改的事件不会报告；PageFlow 不会自动修改源码。

相关导航规则：

- `duplicate-navigation`：同一元素同时配置链接和跳转事件。
- `incomplete-link-area`：链接没有覆盖具有卡片视觉的完整容器。
- `invalid-navigation-target`：固定跳转目标不在项目路由中。
- `navigation-method-mismatch`：`navigateTo` 指向 Tab 页面，或 `switchTab` 指向非 Tab 页面。

这些规则均可通过 `diagnostics.rules` 单独关闭。源码规则只分析可以静态确定的固定目标，不执行事件，也不修改项目代码。

诊断配置变化后需要重启开发服务器。

## 接口诊断

```json
{
  "apiDiagnostics": {
    "slowRequestMs": 1000,
    "largeResponseBytes": 500000,
    "duplicateWindowMs": 1000
  }
}
```

- `slowRequestMs`：超过该耗时标记为慢接口，默认 `1000`。
- `largeResponseBytes`：超过该响应体积标记为大响应，默认 `500000`。
- `duplicateWindowMs`：同一方法与 URL 在该时间内再次请求时标记为重复，默认 `1000`。

HTTP `4xx / 5xx` 标记为失败；慢请求、大响应和短时间重复请求标记为警告。PageFlow 只分析页面已经发出的请求，不会为诊断重放接口。

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
