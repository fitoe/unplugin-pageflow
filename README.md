# unplugin-pageflow

> 在一张无限画布上，看清应用的全部页面、跳转关系和页面测试。

[![CI](https://github.com/fitoe/unplugin-pageflow/actions/workflows/ci.yml/badge.svg)](https://github.com/fitoe/unplugin-pageflow/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/unplugin-pageflow?color=cb3837&logo=npm)](https://www.npmjs.com/package/unplugin-pageflow)
![Node](https://img.shields.io/badge/Node-%3E%3D20.19-339933?logo=node.js&logoColor=white)

![PageFlow 动画演示：展开页面组、聚焦页面并查看跳转关系](./docs/public/pageflow-demo.svg)

`unplugin-pageflow` 是一个仅在开发环境运行的页面流程可视化插件。它直接读取项目路由、渲染真实页面，并在你聚焦某个页面时识别链接和跳转事件。

不需要维护另一份流程图，也不会向生产构建注入 PageFlow runtime。

## 它解决什么问题

应用变大后，页面散落在路由文件、业务模块、原型和测试中。想回答“系统有哪些页面”“这个按钮会去哪里”“这条流程有没有测试”，往往要在多个工具之间来回查找。

PageFlow 把这些信息放回同一个上下文：

- **应用全貌**：按路由层级组织所有页面，相关页面可以堆叠成组。
- **真实预览**：使用同源 iframe 运行实际页面，而不是展示过期截图。
- **按需关系图**：聚焦页面后才解析它的跳转热点，并把关联页面排到周围。
- **测试关联**：在页面旁查看、运行和管理相关单元测试、组件测试与 E2E 测试。
- **页面诊断**：结合 axe-core、PageFlow 规则与 Lighthouse 检查当前页面，并导出 JSON 报告。

## 3 分钟开始使用

### 1. 安装

```bash
pnpm add -D unplugin-pageflow
```

也可以使用 `npm install -D unplugin-pageflow`。

### 2. 加入 Vite 配置

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import PageFlow from 'unplugin-pageflow'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    PageFlow.vite(),
  ],
})
```

### 3. 启动项目

```bash
pnpm dev
```

访问：

```text
http://localhost:5173/__unplugin-pageflow/
```

端口跟随你的 Vite 开发服务器。Vue Router 路由会自动发现；uni-app 项目还会读取 `pages.json` 中的首页、标题和页面顺序。

### 本地联调 PageFlow 源码

宿主项目始终从构建入口加载插件，不要直接导入 TypeScript 源码：

```ts
import PageFlow from 'unplugin-pageflow'
```

在 PageFlow 仓库持续构建：

```bash
pnpm dev:plugin
```

宿主项目通过本地链接使用该仓库：

```json
{
  "devDependencies": {
    "unplugin-pageflow": "link:C:/Users/imjzq/Projects/PageFlow"
  }
}
```

重新执行一次 `pnpm install` 并启动宿主项目。客户端改动构建到 `dist` 后，PageFlow 页面会自动刷新；插件服务端入口改动后需重启宿主开发服务器。

## 基本工作流

1. 打开 PageFlow，先从路由分组查看应用全貌。
2. 点击页面组，将堆叠页面动画铺开；点击画布空白处返回上级。
3. 点击单个页面进入聚焦，页面会放大并居中。
4. PageFlow 识别当前页面的链接和跳转事件，显示粉红、粉蓝热点。
5. 关联页面移动到焦点页周围，并从热点连接到目标页面。
6. 点击热点或目标页面，进入目标所属分组并继续聚焦；路由参数会保留。

关联页面可以拖动，位置和连线会同步更新。普通拖动、缩放和页面内滚动不会自动切换焦点。

## 主要能力

| 能力 | 行为 |
| --- | --- |
| 路由组织 | 根据路由目录分组；单页不会产生无意义的空编组 |
| 页面预览 | 同源 iframe 渲染真实页面，默认使用 iPhone 15 移动端视口 |
| 跳转识别 | 支持链接、RouterLink、uni-app API 和常见程序式导航 |
| 聚焦关系 | 只分析焦点页的一层关联目标，避免预处理整个应用图 |
| 参数跳转 | 保留 query、hash 和动态路由参数，目标页进入正确分组 |
| 页面状态 | 隔离恢复 query、角色、原生控件、滚动位置和显式状态 |
| 页面接口 | 聚焦后整理当前页面使用的接口、耗时和返回字段 |
| 页面测试 | 自动关联测试，支持单条/批量运行、取消、超时和结果缓存 |
| 页面诊断 | 实时检查可访问性、布局和交互问题；按需运行 Lighthouse 并导出报告 |
| 快照缓存 | DOM 稳定后串行拍摄，支持 compact、高清切片和磁盘缓存 |
| 大型项目 | 视口虚拟化、场景节点缓存、空间索引和 Worker 布局 |

## 框架支持

| 框架 | 接入方式 |
| --- | --- |
| Vite + Vue Router | `PageFlow.vite()` |
| uni-app | `PageFlow.vite()` |
| Nuxt | `modules: ['unplugin-pageflow/nuxt']` |
| Astro | `PageFlow()` from `unplugin-pageflow/astro` |
| React Router | `PageFlow(routeObjects)` from `unplugin-pageflow/react-router` |
| SvelteKit | `...PageFlow()` from `unplugin-pageflow/sveltekit` |
| SolidStart | `...PageFlow()` from `unplugin-pageflow/solid-start` |
| Qwik City | `PageFlow()` from `unplugin-pageflow/qwik-city` |
| Next.js | `pageflow-next` 开发期 sidecar |
| 普通 Vite 项目 | 通过 `routes` 显式提供路由 |

框架差异、支持范围和完整示例见[兼容性文档](./docs/zh/reference/compatibility.md)。

<details>
<summary><strong>Nuxt、Astro 和 Next.js 快速接入</strong></summary>

### Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['unplugin-pageflow/nuxt'],
})
```

### Astro

```ts
// astro.config.mjs
import PageFlow from 'unplugin-pageflow/astro'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [PageFlow()],
})
```

### Next.js

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

</details>

## 常用配置

### 页面诊断

聚焦页面后打开右侧“诊断”标签：

- axe-core 检查 WCAG、ARIA、可访问名称、标题结构和颜色对比度。
- PageFlow 检查字号、点击区域、横向溢出、图片尺寸、无效链接等页面规则。
- “运行审计”按需启动 Lighthouse，返回性能、无障碍、最佳实践和 SEO 分数。
- 下载按钮导出当前页面的 JSON 报告；报告不包含 Cookie、Token 或浏览器存储。

Lighthouse 会在本机启动临时无头 Chrome。审计登录页面时，PageFlow 仅在内存中向临时浏览器恢复当前预览的 Cookie 和浏览器存储，审计结束后立即关闭浏览器，不会把会话写入报告或磁盘。

### 动态路由

为动态参数提供可安全访问的开发值：

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

### 页面状态

原生输入框、下拉框、复选框和滚动位置会自动恢复。复杂组件或页面变量可显式注册：

```ts
import { onUnmounted, ref } from 'vue'
import { definePageFlowState } from 'unplugin-pageflow/runtime-state'

const activeTab = ref('overview')

const stop = definePageFlowState('page-options', {
  get: () => ({ activeTab: activeTab.value }),
  restore: state => {
    activeTab.value = state.activeTab
  },
})

onUnmounted(stop)
```

状态按页面 URL 和预览角色隔离。不要注册 Token、密码、验证码等敏感信息。

### 页面测试

PageFlow 会通过组件引用、同名测试文件、完整页面路由或显式映射，把测试关联到页面：

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
  testCommands: {
    unit: {
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

测试命令只有显式配置后才可运行，并通过 `spawn`、`shell: false` 执行。结果缓存在 `.unplugin-pageflow/cache`；测试文件内容变化后自动失效。

完整选项见[配置参考](./docs/zh/reference/configuration.md)。

## 快照与性能

PageFlow 不会同时把所有页面保持为活动 iframe：

- 页面进入视口或参与聚焦时才挂载预览；
- 字体、图片、网络请求和 DOM 稳定后才进入截图队列；
- `modern-screenshot` 为主渲染器，失败时回退 `html2canvas-pro`；
- 远处页面使用 compact WebP，附近长页按需挂载高清切片；
- 快照、测试结果和场景状态使用有界缓存；
- 缩放和拖动期间暂停重拍及 iframe 切换，减少闪烁和抖动。

长时间异步加载的页面可以主动通知 PageFlow：

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```

## 配置与缓存文件

| 路径 | 用途 | 是否建议提交 |
| --- | --- | --- |
| `.pageflow` | 路由、角色、分组名称和显式页面测试配置 | 是 |
| `.unplugin-pageflow/` | 缩略图、测试结果等本地缓存 | 否 |

## 安全边界

- PageFlow 不绕过认证或授权。
- 它不会自动点击业务控件。
- 它会阻止预览中的真实链接跳转和表单提交，把导航交给画布处理。
- 它不会抑制页面初始化副作用；会写数据的页面应使用本地或可清理测试环境。
- 运行时计算的跳转目标，可能需要相关交互发生后才能被识别。

更多说明见[限制与安全](./docs/zh/reference/limitations.md)。

## 文档

- [快速开始](./docs/zh/guide/getting-started.md)
- [基本概念](./docs/zh/guide/concepts.md)
- [使用画布](./docs/zh/guide/canvas.md)
- [页面状态](./docs/zh/guide/state.md)
- [页面测试](./docs/zh/guide/page-tests.md)
- [大型项目与缓存](./docs/zh/guide/large-projects.md)
- [故障排查](./docs/zh/guide/troubleshooting.md)
- [常见问题](./docs/zh/guide/faq.md)

## 本地开发

```bash
pnpm install
pnpm playground
pnpm test
pnpm build
```

完整检查：

```bash
pnpm check
```

要求 Node.js `>=20.19`、npm `>=10`。

<details>
<summary><strong>English summary</strong></summary>

`unplugin-pageflow` is a development-only visual map for application routes, real page previews, navigation hotspots, page state, API activity, and related tests.

```bash
pnpm add -D unplugin-pageflow
```

```ts
import PageFlow from 'unplugin-pageflow'

export default {
  plugins: [PageFlow.vite()],
}
```

Open `/__unplugin-pageflow/` on the development server. PageFlow does not inject its runtime into production builds.

Supported integrations include Vue Router, uni-app, Nuxt, Astro, React Router, SvelteKit, SolidStart, Qwik City, Next.js, and explicit routes in plain Vite projects.

See the [English documentation](./docs/guide/getting-started.md) for framework-specific setup.

</details>
