# Vite + Vue Router

对于 Vue Router 应用，Vite 适配器提供最直接的 PageFlow 接入方式。

## 安装

```bash
pnpm add -D unplugin-pageflow
```

## 配置

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

正常启动 Vite，然后打开终端输出的 PageFlow 地址。

## 路由发现

开发运行时读取 `router.getRoutes()`，识别 Vue Router 链接以及字面量 `router.push()`、`router.replace()` 目标，并通过 Vite HMR 更新路由与连接。

## 动态路由

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## 页面状态

原生控件和滚动位置可以自动恢复。应用特有的 Vue 状态可使用 [`definePageFlowState`](/zh/guide/state) 接入。

## 限制

- 运行时计算的目标只有在应用暴露后才能发现。
- 身份认证来自当前浏览器会话。
- 页面初始化副作用仍会执行。

