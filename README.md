# unplugin-pageflow

> See every application page and navigation path on one infinite canvas.

[![CI](https://github.com/fitoe/unplugin-pageflow/actions/workflows/ci.yml/badge.svg)](https://github.com/fitoe/unplugin-pageflow/actions/workflows/ci.yml)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.4%2B-42B883?logo=vuedotjs&logoColor=white)

`unplugin-pageflow` is a development-only visual map for Vite applications and their routing frameworks. It discovers routes, renders real pages, highlights navigation hotspots, and draws page relationships—without touching your production bundle.

![unplugin-pageflow demo](./docs/demo.png)

## Why

- **See the whole product** — browse every route on a zoomable LeaferJS canvas.
- **Preview real pages** — inspect the actual Vue application through same-origin iframes.
- **Understand navigation** — detect `<RouterLink>`, anchors, and literal `router.push()` / `router.replace()` targets.
- **Stay in flow** — route and link changes update through Vite HMR.
- **Dev only** — no PageFlow runtime is injected into production builds.

## Install

```bash
npm install -D unplugin-pageflow
```

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

Start Vite as usual:

```bash
npm run dev
```

Nuxt:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['unplugin-pageflow/nuxt'],
})
```

Astro:

```ts
// astro.config.mjs
import PageFlow from 'unplugin-pageflow/astro'
import { defineConfig } from 'astro/config'

export default defineConfig({ integrations: [PageFlow()] })
```

React Router, SvelteKit, SolidStart, and Qwik City expose dedicated adapters:

```ts
import PageFlow from 'unplugin-pageflow/react-router' // PageFlow(routeObjects)
import PageFlow from 'unplugin-pageflow/sveltekit'    // plugins: [sveltekit(), ...PageFlow()]
import PageFlow from 'unplugin-pageflow/solid-start'  // plugins: [...PageFlow(), solid()]
import PageFlow from 'unplugin-pageflow/qwik-city'    // plugins: [qwikCity(), qwikVite(), PageFlow()]
```

Next.js uses a development-only same-origin sidecar because current Next releases do not expose Vite plugins:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

The CLI prints the preview URL:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

## Options

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

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Enable the development tool. |
| `previewPath` | `/__unplugin-pageflow/` | URL of the visual map. |
| `appUrl` | `/` | Route used to discover the Vue Router instance. |
| `dynamicParams` | `{}` | Sample values for dynamic route parameters. |

## How it works

The Vite plugin injects a small runtime only while the dev server is running. The runtime reads `router.getRoutes()`, reports visible navigation hotspots, and sends graph updates to the PageFlow client. LeaferJS renders the infinite canvas and relationships; same-origin iframes render the real pages.

Large projects remain usable through bounded viewport rendering, persistent thumbnails, one selected live iframe, and on-demand runtime link discovery for the initial or selected page. Both DOM previews and LeaferJS scene objects are limited to nearby pages. Thumbnails are cached in `.unplugin-pageflow/cache`, survive reloads, and remain visible while stale pages are refreshed in the background. Distant pages use compact WebP previews; nearby long pages are split into viewport-mounted tiles. Layout runs in a Worker for graphs above 1,000 pages, while a spatial index avoids scanning the full graph during navigation. Memory and disk caches use fixed LRU budgets. PageFlow waits for fonts, images, and a quiet DOM before capturing one page at a time. Pages with long-running async work can explicitly signal readiness:

```ts
(window as any).__UNPLUGIN_PAGEFLOW_READY__?.()
```

## Preview safety

Preview mode blocks anchor navigation and form submission. It does not click controls, bypass authentication, or suppress application startup side effects. Use local or test data for pages that perform writes during initialization.

## Current scope

- Vite + Vue Router, uni-app, Nuxt, Astro, React Router, SvelteKit, SolidStart, Next.js, and Qwik City are supported in development mode.
- Nuxt uses its Vue Router routes and recognizes component navigation events.
- Astro uses file routes, same-origin anchors, and explicit `data-pageflow-to` targets; island framework internals are intentionally not inspected.
- Computed programmatic destinations are discovered after the corresponding interaction occurs.
- Authentication and route-specific state come from the current browser session.

## Development

```bash
npm install
npm run playground
npm run check
```

Requires Node.js `>=20.19` and npm `>=10`.

<details>
<summary><strong>中文说明</strong></summary>

`unplugin-pageflow` 是一个仅在开发环境运行的页面流程可视化插件，支持 Vite + Vue Router、uni-app、Nuxt、Astro、React Router、SvelteKit、SolidStart、Next.js 和 Qwik City。它会自动发现路由，在无限画布中展示页面，标记页面跳转热区，并绘制页面之间的导航关系；生产构建不会注入 PageFlow 代码。

### 安装

```bash
npm install -D unplugin-pageflow
```

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import PageFlow from 'unplugin-pageflow'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), PageFlow.vite()],
})
```

正常启动项目：

```bash
npm run dev
```

Nuxt 使用 `modules: ['unplugin-pageflow/nuxt']`；Astro 在 `integrations` 中加入 `PageFlow()`（从 `unplugin-pageflow/astro` 导入）。

React Router、SvelteKit、SolidStart、Qwik City 分别使用对应子路径适配器。Next.js 开发环境使用 `pageflow-next --dir . --port 3000` 启动同源 sidecar；生产构建不使用它。

CLI 会输出预览地址：

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

主要能力：

- 自动发现 Vue Router 路由
- 在 LeaferJS 无限画布中展示页面关系
- 使用同源 iframe 渲染真实页面
- 字体、图片及 DOM 稳定后顺序生成快照；异步页面可调用 `window.__UNPLUGIN_PAGEFLOW_READY__()` 主动通知
- 识别 `<RouterLink>`、同源链接和字面量程序式跳转
- 支持动态路由示例参数、HMR、按需扫描及 DOM/Leafer 双层虚拟化
- 仅开发环境启用，不进入生产产物

动态路由可以配置示例参数：

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

原生输入框、下拉框、复选框和页面滚动位置会在 PageFlow 预览中自动恢复。复杂组件或 Vue 页面变量可显式注册：

```ts
import { onUnmounted, ref } from 'vue'
import { definePageFlowState } from 'unplugin-pageflow/runtime-state'

const activeTab = ref('overview')
const selectedRole = ref('farmer')

const stopPageFlowState = definePageFlowState('page-options', {
  get: () => ({ activeTab: activeTab.value, selectedRole: selectedRole.value }),
  restore: state => {
    activeTab.value = state.activeTab
    selectedRole.value = state.selectedRole
  },
})
onUnmounted(stopPageFlowState)
```

缓存按页面 URL（包含业务 query/hash）和 PageFlow 角色隔离。不要注册 Token、密码、验证码等敏感信息；密码、文件和验证码输入框也不会被自动缓存。

要求 Node.js `>=20.19`、npm `>=10`。Astro 支持文件路由、同源 `<a>` 和 `data-pageflow-to`；不会依赖 React/Vue/Svelte island 的内部实现。

</details>

## 发布

更新 `package.json` 中的版本并推送到 `master` 或 `main` 后，GitHub Actions 会运行完整检查，并在 npm 尚无该版本时自动发布。仓库需要配置一个名为 `NPM_TOKEN` 的 Actions secret；Token 应使用 npm granular access token，并允许发布该包。
