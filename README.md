# PageFlow

> 在一张无限画布上，看清应用的页面、跳转、接口、测试与问题。

[![CI](https://github.com/fitoe/unplugin-pageflow/actions/workflows/ci.yml/badge.svg)](https://github.com/fitoe/unplugin-pageflow/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/unplugin-pageflow?color=cb3837&logo=npm)](https://www.npmjs.com/package/unplugin-pageflow)
![Node](https://img.shields.io/badge/Node-%3E%3D20.19-339933?logo=node.js&logoColor=white)

PageFlow 是一个开发环境页面流程可视化插件。它自动读取项目路由，在无限画布中运行真实页面，并把页面之间的导航关系、接口请求、相关测试和诊断结果放进同一个上下文。

PageFlow 也提供独立 Chrome 扩展：不改造目标项目即可使用页面、接口、基础诊断、截图和 Todo。需要源码、HMR 和测试集成时使用 unplugin；扩展的开发与安装说明见 [`packages/chrome-extension`](packages/chrome-extension/README.md)。

**真实页面，不是截图 · 自动发现路由 · 不进入生产构建**

[快速开始](#快速开始) · [在线文档](https://pageflowjs.github.io) · [框架接入](https://pageflowjs.github.io/guide/getting-started) · [npm](https://www.npmjs.com/package/unplugin-pageflow)

![PageFlow 动画演示：展开页面组、聚焦页面并查看跳转关系](./docs/public/pageflow-demo.svg)

## 为什么使用 PageFlow

应用变大后，页面分散在路由、模块、接口和测试中。开发者经常需要回答：

- 项目到底有哪些页面？
- 当前按钮会跳到哪里？
- 某个页面从哪里进入，又能前往哪里？
- 当前页面调用了哪些接口？
- 页面有没有关联测试和明显问题？

传统流程图需要额外维护，静态截图又容易过期。PageFlow 直接使用项目正在运行的页面和路由，把答案放回一张可以拖动、缩放和探索的画布。

## 它如何工作

```text
发现项目路由 → 在画布中运行真实页面 → 聚焦页面并检查关联信息
```

1. PageFlow 从框架路由或显式配置中发现页面。
2. 页面按路由层级组织，在进入视口时按需渲染。
3. 聚焦页面后，PageFlow 识别链接与程序式导航。
4. 关联页面移动到焦点页周围，并从实际交互位置建立连线。
5. 右侧面板集中显示接口、测试与诊断结果。

## 核心能力

| 能力 | 你可以做什么 |
| --- | --- |
| 无限路由画布 | 从全局查看应用结构，按路由层级展开或收起页面组 |
| 真实页面预览 | 直接运行项目页面，不依赖另一套原型或过期截图 |
| 导航关系发现 | 识别链接、RouterLink、uni-app API 和常见程序式跳转 |
| 接口检查 | 查看当前页面的请求方法、路由、耗时、状态和返回字段 |
| 页面测试 | 自动关联单元、组件和 E2E 测试，并按配置触发执行 |
| 轻量诊断 | 检查可访问性、布局、交互和导航问题，并定位对应元素 |
| AI 协作 | 复制当前页面的结构化上下文和修复提示词，交给任意编码助手分析 |

PageFlow 只分析当前需要的页面，不会预先启动整个应用的所有 iframe。

## 快速开始

### 1. 安装

```bash
pnpm add -D unplugin-pageflow
```

也可以使用 `npm install -D unplugin-pageflow`。

### 2. 加入 Vite 配置

```ts
// vite.config.ts
import PageFlow from 'unplugin-pageflow'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    PageFlow.vite(),
  ],
})
```

### 3. 启动项目

```bash
pnpm dev
```

打开开发服务器上的：

```text
http://localhost:5173/__unplugin-pageflow/
```

宿主页面右下角也会显示 PageFlow 浮动按钮，点击后在新窗口打开面板。若不需要，可关闭：

```ts
PageFlow.vite({ launcher: false })
```

可在 `.pageflow` 中把页面绑定到 Figma 节点；聚焦该页面后，预览旁会显示 Figma 按钮：

```json
{
  "figmaPages": {
    "/pages/agri-condition/home/index": "https://www.figma.com/design/FILE_KEY/Project?node-id=123-456"
  }
}
```

浮动按钮只注入开发环境，不进入生产构建。端口跟随项目的 Vite 开发服务器。Vue Router 路由会自动发现；uni-app 以 `pages.json` 作为页面集合与顺序的唯一来源，`.pageflow` 中的 `routes` 只用于覆盖路由元数据或补充自定义页面，不会裁剪 `pages.json` 页面。

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

查看[兼容性与限制](https://pageflowjs.github.io/reference/compatibility)以及[各框架接入指南](https://pageflowjs.github.io/guide/getting-started)。

## 适合这些场景

- **接手陌生项目**：快速理解页面范围和主要流程。
- **大型应用梳理**：从路由分组进入具体页面，不在文件树中反复跳转。
- **UI 重构**：在修改前确认页面入口、目标页面和关联测试。
- **跳转问题排查**：发现失效路由、重复导航和不合适的导航方法。
- **Code Review**：把页面、接口、测试和诊断放在同一上下文中检查。
- **测试补齐**：看到页面是否有关联测试，以及最近一次执行结果。

## 开发环境专用

PageFlow 的运行边界明确：

- 仅在开发服务器中启用，不向生产构建注入 runtime。
- 页面进入视口或参与聚焦时才挂载真实预览。
- 只分析焦点页的一层导航关系，不持续扫描整个应用。
- 缩略图、测试结果和画布状态使用本地有界缓存。
- 项目专属规则通过可选 Inspector 注册，不进入 PageFlow 核心。

## 页面诊断

PageFlow 可以检查：

- 缺少可访问名称、无效链接和交互控件嵌套；
- 点击区域、字号、对比度、横向溢出和图片尺寸；
- 纯跳转事件、重复导航、失效路由和导航方法不匹配；
- HTTP 失败、慢请求、大响应和短时间重复请求。

诊断只报告问题，不自动修改项目源码。Lighthouse 审计按需运行，不会因为打开 PageFlow 自动启动。

规则阈值、忽略区域和开关见[配置参考](https://pageflowjs.github.io/reference/configuration)。

### 与 AI 协作

聚焦页面后，可在“诊断”面板复制 AI 修复提示词。提示词包含当前路由、诊断、接口请求、相关测试、页面链接和 Lighthouse 结果，可直接交给 Codex、Claude Code、Cursor 或其他编码助手。

PageFlow 不内置模型、不上传项目数据，也不自动修改源码。编码助手完成修改后，Vite 热更新会让 PageFlow 自动重新检查当前页面。

PageFlow 还会把当前焦点页上下文同步到仅存在于本地开发服务器内存的 JSON 接口：

```text
http://localhost:5173/__unplugin-pageflow/api/ai-context?path=/pages/mine
```

端口和路由参数按实际项目调整。页面尚未在画布中聚焦时，接口返回 `404`。

## 按需扩展

项目专属检查可以通过独立入口注册，不需要把业务规则加入 PageFlow：

```ts
import { registerPageFlowInspector } from 'unplugin-pageflow/inspectors'

const dispose = registerPageFlowInspector({
  id: 'project-rules',
  inspect({ document }) {
    return document.querySelector('[data-project-warning]')
      ? [{
          ruleId: 'project-warning',
          severity: 'suggestion',
          category: 'interaction',
          title: '发现项目提示',
          description: '这是由宿主项目提供的检查结果。',
        }]
      : []
  },
})
```

Inspector 只在 PageFlow 请求诊断时运行，支持同步、异步和注销。单个 Inspector 失败不会中断其他检查。

## 常见问题

<details>
<summary><strong>PageFlow 会进入生产包吗？</strong></summary>

不会。插件及页面 runtime 只在开发服务器中启用，生产构建不会注入 PageFlow runtime。

</details>

<details>
<summary><strong>它会替代 Storybook、测试框架或设计工具吗？</strong></summary>

不会。PageFlow 负责把应用路由和真实页面组织成可探索的流程画布，并关联项目已有的接口、测试和诊断信息。

</details>

<details>
<summary><strong>它会自动点击页面或提交表单吗？</strong></summary>

不会。PageFlow 不自动操作业务控件，也不会绕过认证或授权。预览页面仍可能执行自身初始化逻辑，因此涉及真实写入时应使用本地或可清理测试环境。

</details>

<details>
<summary><strong>动态路由和登录页面可以预览吗？</strong></summary>

可以通过配置提供安全的动态参数和本地预览会话。PageFlow 不接管项目权限模型，也不要在页面状态中注册 Token、密码或验证码。

</details>

## 文档

- [快速开始](https://pageflowjs.github.io/guide/getting-started)
- [基本概念](https://pageflowjs.github.io/guide/concepts)
- [使用画布](https://pageflowjs.github.io/guide/canvas)
- [页面状态](https://pageflowjs.github.io/guide/state)
- [页面测试](https://pageflowjs.github.io/guide/page-tests)
- [大型项目与缓存](https://pageflowjs.github.io/guide/large-projects)
- [配置参考](https://pageflowjs.github.io/reference/configuration)
- [限制与安全](https://pageflowjs.github.io/reference/limitations)
- [故障排查](https://pageflowjs.github.io/guide/troubleshooting)

## 参与开发

```bash
pnpm install
pnpm playground
pnpm test
pnpm build
```

日常快速检查（类型检查与核心测试）：

```bash
pnpm check
```

发布前完整检查（包含构建、全量测试、Chrome E2E 与打包验证）：

```bash
pnpm check:full
```

要求 Node.js `>=20.19`、npm `>=10`。
