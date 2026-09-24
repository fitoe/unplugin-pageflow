# PageFlow

> 在一张无限画布上，查看应用页面、追踪跳转，并检查接口、测试与诊断结果。

[![CI](https://github.com/fitoe/unplugin-pageflow/actions/workflows/ci.yml/badge.svg)](https://github.com/fitoe/unplugin-pageflow/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/unplugin-pageflow?color=cb3837&logo=npm)](https://www.npmjs.com/package/unplugin-pageflow)
![Node](https://img.shields.io/badge/Node-%3E%3D20.19-339933?logo=node.js&logoColor=white)

PageFlow 是面向开发与调试的页面流程工作台。它从项目路由发现页面，在画布中按需加载真实预览，把导航关系和页面相关信息集中到一起。适合接手陌生项目、梳理业务流程、排查跳转问题，以及检查页面改动。

[快速开始](#快速开始) · [在线文档](https://pageflowjs.github.io) · [框架接入](https://pageflowjs.github.io/integrations/) · [Chrome 扩展](https://pageflowjs.github.io/guide/chrome-extension)

![PageFlow 动画演示：展开页面组、聚焦页面并查看跳转关系](https://raw.githubusercontent.com/fitoe/unplugin-pageflow/master/docs/public/pageflow-demo.svg)

## 你可以用它做什么

| 想了解的问题 | PageFlow 提供的能力 |
| --- | --- |
| 项目有哪些页面？ | 路由画布、页面搜索和分组浏览 |
| 这个页面能跳到哪里？ | 导航目标发现、交互热点与方向连线 |
| 页面实际运行是什么样？ | 按需加载真实页面，结合缩略图浏览更多页面 |
| 页面调用了哪些接口？ | Fetch/XHR 请求、耗时、状态和响应字段 |
| 哪些问题值得检查？ | 可访问性、布局、交互、导航与接口诊断 |
| 页面有哪些相关测试？ | 关联单元、组件及 E2E 测试，查看或触发执行结果 |
| 如何把问题交给编码助手？ | 复制包含路由、接口、测试与诊断的页面上下文 |

## 选择使用方式

| | 项目插件 `unplugin-pageflow` | Chrome 扩展 |
| --- | --- | --- |
| 接入 | 安装开发依赖并配置项目 | 安装浏览器扩展，无需修改目标项目 |
| 页面与接口 | 路由画布、页面预览、请求检查 | 页面画板、请求检查 |
| 检查与记录 | 页面诊断、按需 Lighthouse 审计 | 基础诊断、截图与 Todo |
| 源码与测试 | 源码分析、HMR 更新、测试发现与执行 | 使用项目插件获得这些能力 |
| 适用场景 | 持续开发、调试和回归检查 | 快速检查当前浏览器页面 |

需要与项目源码联动时，按下面的步骤安装插件。浏览器扩展的安装和权限说明见 [Chrome 扩展指南](https://pageflowjs.github.io/guide/chrome-extension)。

## 快速开始

以下以 **Vite + Vue Router** 项目为例，需要 Node.js `>=20.19`。其他框架见[框架支持](#框架支持)。

### 1. 安装开发依赖

```bash
pnpm add -D unplugin-pageflow
# 或 npm install -D unplugin-pageflow
```

### 2. 添加插件

在现有 Vite 配置中保留项目原有插件，并加入 `PageFlow.vite()`：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import PageFlow from 'unplugin-pageflow'

export default defineConfig({
  plugins: [vue(), PageFlow.vite()],
})
```

### 3. 启动并打开画布

```bash
pnpm dev
```

打开终端输出的 PageFlow 地址，例如：

```text
http://localhost:5173/__unplugin-pageflow/
```

端口跟随宿主开发服务器。也可以点击宿主页面右下角的 PageFlow 浮动按钮。

进入画布后，搜索一个页面并聚焦它：查看真实预览、点击热点和右侧关联信息。若未发现页面，检查框架接入方式，或通过 `routes` 显式提供路由，参见[配置参考](https://pageflowjs.github.io/reference/configuration)。

## 一次典型的检查流程

1. **找到页面**：搜索路由，或逐层展开页面组，缩小检查范围。
2. **查看关系**：聚焦页面，查看已识别的导航目标和热点连线。
3. **检查运行信息**：查看接口请求和诊断，定位异常元素；需要性能评估时手动运行 Lighthouse。
4. **验证改动**：查看关联测试并按需执行，结合 HMR 更新检查页面变化。
5. **交接问题**：复制页面上下文或 AI 修复提示词，交给团队成员或编码助手。

### 整理页面与预览

页面树支持分组和排序。跨目录拖动只把显示位置保存到 `.pageflow`，页面 URL、路由配置、源码文件和导入关系保持不变。

画布结合缩略图与按需挂载的真实预览，不会一次启动所有页面的 iframe。动态路由参数、登录会话和页面状态可以按项目配置，详见[动态路由](https://pageflowjs.github.io/guide/dynamic-routes)、[页面状态](https://pageflowjs.github.io/guide/state)和[大型项目与缓存](https://pageflowjs.github.io/guide/large-projects)。

### 关联测试

PageFlow 根据组件导入、同名文件约定、路由引用或显式映射关联测试。检测到项目已安装 Vitest 时，可自动提供单元与组件测试命令；其他执行方式通过 `testCommands` 配置。测试由用户触发，结果保存在本地。

配置方法见[页面测试](https://pageflowjs.github.io/guide/page-tests)。

### 对照 Figma 设计

聚焦页面后，点击 Figma 按钮并粘贴节点链接即可绑定。也可以在项目根目录的 `.pageflow` 中配置：

```json
{
  "pages": {
    "/orders": {
      "figma": "FILE_KEY#123:456"
    }
  }
}
```

如需查询设计文件版本，在运行插件的服务端环境设置 `FIGMA_ACCESS_TOKEN`，也兼容 `FIGMA_TOKEN`。令牌无需写入 `.pageflow`。版本提示表示整个 Figma 文件有更新，不代表绑定节点一定发生了变化。

### 与 AI 协作

在诊断面板复制修复提示词，即可把页面路由、诊断、接口、相关测试和已获取的 Lighthouse 结果交给 Codex、Claude Code、Cursor 等编码助手。PageFlow 不内置模型；由你选择如何使用这些上下文。

项目插件还提供当前已聚焦页面的上下文接口：

```text
http://localhost:5173/__unplugin-pageflow/api/ai-context?path=/orders
```

上下文保存在开发服务器内存中；尚未采集该页面时返回 `404`。端口和页面路径按实际项目调整。

## 框架支持

| 框架 | 接入入口 |
| --- | --- |
| Vite + Vue Router | `PageFlow.vite()` |
| uni-app（Vite / H5 开发预览） | `PageFlow.vite()` |
| Nuxt | `unplugin-pageflow/nuxt` |
| Astro | `unplugin-pageflow/astro` |
| React Router | `unplugin-pageflow/react-router` |
| SvelteKit | `unplugin-pageflow/sveltekit` |
| SolidStart | `unplugin-pageflow/solid-start` |
| Qwik City | `unplugin-pageflow/qwik-city` |
| Next.js | `pageflow-next` 开发入口 |
| 其他 Vite 项目 | `PageFlow.vite({ routes: [...] })`，显式提供路由 |

各入口的配置方式不同，完整示例见[框架接入指南](https://pageflowjs.github.io/integrations/)，版本要求见[兼容性说明](https://pageflowjs.github.io/reference/compatibility)。

uni-app 的页面集合与顺序来自 `pages.json`；`.pageflow` 中的 `routes` 可覆盖路由元数据或补充自定义页面。

## 使用边界

- **项目插件仅用于开发环境**：生产构建不会注入 PageFlow runtime。
- **预览运行真实页面**：页面初始化仍会发起请求并执行自身逻辑；涉及写入时请使用本地或测试数据。
- **预览遵循应用权限**：PageFlow 不绕过登录和授权，真实页面预览需要同源 iframe 访问能力。
- **导航发现有范围**：识别支持的链接和程序式跳转，无法预先推断所有动态目标。
- **诊断需要判断**：结果用于辅助检查；Lighthouse 按需运行，项目专属规则可通过 `unplugin-pageflow/inspectors` 注册。

更多说明见[限制与安全](https://pageflowjs.github.io/reference/limitations)及[故障排查](https://pageflowjs.github.io/guide/troubleshooting)。

## 参与开发

仓库使用 pnpm workspace，CI 使用 pnpm 10。安装依赖后可启动示例项目：

```bash
pnpm install
pnpm playground
```

| 命令 | 用途 |
| --- | --- |
| `pnpm check` | 类型检查与核心测试 |
| `pnpm test` | 全量 `*.test.mjs` 测试 |
| `pnpm build:plugin` | 构建可发布插件与画布客户端 |
| `pnpm dev:chrome` | 开发 Chrome 扩展 |
| `pnpm docs:dev` | 本地预览文档 |
| `pnpm check:full` | 发布前完整检查，含构建、Chrome E2E 和打包验证 |

运行浏览器测试前，可用 `pnpm exec playwright install chromium` 安装测试浏览器。扩展开发细节见 [Chrome 扩展开发说明](https://github.com/fitoe/unplugin-pageflow/blob/master/packages/chrome-extension/README.md)。

遇到问题时，请在 [GitHub Issues](https://github.com/fitoe/unplugin-pageflow/issues) 中提供框架及版本、接入配置、复现步骤和相关日志。
