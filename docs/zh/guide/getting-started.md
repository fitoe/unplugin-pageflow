# 快速开始

PageFlow 是一个仅用于开发环境的可视化工具，用来展示应用路由和页面之间的导航路径。

## 环境要求

- Node.js 20.19 或更高版本
- 使用 PageFlow 支持的框架
- 对于初始化时会执行写操作的页面，请使用本地或测试数据

## 安装

```bash
pnpm add -D unplugin-pageflow
```

## 配置 Vite

以使用 Vue Router 的 Vite 应用为例：

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

## 打开 PageFlow

照常启动开发服务器：

```bash
pnpm dev
```

终端会输出预览地址：

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

打开该地址即可浏览路由地图。滚动缩放画布，拖动画布移动视野，选择页面可查看它与其他页面的关系。

## 下一步

- [选择其他框架接入方式](/zh/integrations/)
- [配置动态路由参数](/zh/reference/configuration#动态路由参数)
- [了解预览限制与安全注意事项](/zh/reference/limitations)

