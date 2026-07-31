---
layout: home

title: PageFlow
titleTemplate: 看见每个页面，理解每条路径
description: 自动发现应用路由、预览真实页面，并在无限画布上梳理导航关系。

hero:
  name: PageFlow
  text: 看见每个页面，理解每条路径。
  tagline: 自动发现路由、预览真实页面，并在一张无限画布上追踪应用中的导航关系。
  image:
    src: /pageflow-demo.svg
    alt: PageFlow 动画展示应用页面重组及导航路径
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: 看见每个页面
    details: 自动发现应用路由，并将它们排列在可缩放的无限画布上。
  - icon: 🖼️
    title: 预览真实界面
    details: 直接查看同源页面预览，不再依赖静态线框图。
  - icon: 🔗
    title: 理解导航关系
    details: 识别导航热点，展示页面之间的连接关系。
  - icon: 🧩
    title: 支持多种框架
    details: 接入 Vue、React、Nuxt、Next.js、Astro、SvelteKit、SolidStart 和 Qwik City。
  - icon: 🧪
    title: 关联页面测试
    details: 将路由与单元测试、组件测试和端到端测试关联起来。
  - icon: 🛡️
    title: 仅限开发环境
    details: PageFlow 运行时代码不会进入生产构建。
---

## 几分钟即可开始

```bash
pnpm add -D unplugin-pageflow
```

在开发配置中加入 PageFlow，启动应用，然后打开插件输出的访问地址。

[阅读快速开始指南 →](/zh/guide/getting-started)

## 深入了解 PageFlow

### 学习基本工作流

- [理解页面、连接、热点、预览和路由组](/zh/guide/concepts)
- [浏览无限画布](/zh/guide/canvas)
- [为动态路由提供安全示例值](/zh/guide/dynamic-routes)
- [恢复原生控件和应用状态](/zh/guide/state)

### 连接开发工具

- [关联并运行页面测试](/zh/guide/page-tests)
- [使用有界渲染和缓存支持大型项目](/zh/guide/large-projects)
- [了解路由发现和页面预览的工作原理](/zh/guide/how-it-works)

### 查找答案

- [查看框架兼容性](/zh/reference/compatibility)
- [排查页面、路由、导航和测试问题](/zh/guide/troubleshooting)
- [阅读常见问题](/zh/guide/faq)
