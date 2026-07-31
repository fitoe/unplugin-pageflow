# 兼容性

PageFlow 要求 Node.js 20.19 或更高版本，并应作为开发依赖安装。

| 集成 | 最低 Peer 版本 | 路由来源 | 说明 |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5、Vue 3.4、Vue Router 4 | `router.getRoutes()` | 完整开发运行时集成。 |
| Nuxt | Nuxt 3 | Vue Router 路由记录 | 识别 Nuxt/Vue 导航事件。 |
| Astro | Astro 5 | 文件路由 | 支持同源链接和 `data-pageflow-to`，不检查 Island 内部。 |
| React Router | 路由对象 | 显式路由对象 | 使用 `unplugin-pageflow/react-router`。 |
| SvelteKit | SvelteKit 2 | 文件路由 | 与 `sveltekit()` 组合使用。 |
| SolidStart | SolidStart | 文件路由 | 与 Solid 插件组合使用。 |
| Qwik City | Qwik 1.10、Qwik City 1.10 | 文件路由 | 与 Qwik City、Vite 组合使用。 |
| Next.js | Next.js 15 | 文件路由 | 使用 `pageflow-next` 开发 sidecar。 |
| uni-app | 当前 Vite 方案 | 生成路由 | 仅限开发环境。 |

## 浏览器要求

页面预览要求同源 iframe 访问，并需要支持标准 History、消息通信和 Canvas 的现代浏览器。

## 生产支持

PageFlow 有意不提供生产运行时。生产构建不应包含其客户端或开发端点。

## 版本策略

Peer 范围描述当前支持的集成边界。采用框架新主版本前，请检查包清单和 CI 状态。
