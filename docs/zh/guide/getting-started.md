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
PageFlow: http://localhost:5173/__unplugin-pageflow/
```

打开该地址即可浏览路由地图。滚动缩放画布，拖动画布移动视野，选择页面可查看它与其他页面的关系。

看到以下结果即表示接入成功：

- 宿主项目终端输出 `PageFlow:` 画板地址；
- 画布底部显示 `Routes synced`；
- 搜索可以找到应用首页；
- 聚焦页面后，缓存卡片会切换为真实 iframe。

如果其中一项缺失，先确认打开的是宿主项目终端输出的地址；修改插件或路由配置后，请重启宿主开发服务器。

## 本地开发插件

宿主项目始终使用构建入口：

```ts
import PageFlow from 'unplugin-pageflow'
```

不要导入 `unplugin-pageflow/source`；Node.js 的 TypeScript strip-only 模式不能执行插件源码中的全部 TypeScript 语法。

在 PageFlow 仓库运行 `pnpm dev:plugin`，并在宿主项目中用 `link:` 依赖指向该仓库。客户端构建产物变化后，PageFlow 页面会自动刷新；服务端插件入口变化后需重启宿主开发服务器。

## 下一步

- [选择其他框架接入方式](/integrations/)
- [配置动态路由参数](/reference/configuration#动态路由参数)
- [了解预览限制与安全注意事项](/reference/limitations)
