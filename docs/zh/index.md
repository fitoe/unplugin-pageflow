---
layout: home

title: PageFlow
titleTemplate: 产品体验，藏在页面之间
description: 将路由、真实页面、导航路径和页面测试汇聚成一张持续更新的产品地图。

hero:
  name: PageFlow
  text: 产品体验，藏在页面之间。
  tagline: 路由表只能告诉你页面在哪里，却无法说明整个体验如何连成一体。PageFlow 将真实页面、导航路径和页面测试汇聚到一张持续更新的画布上。
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
  - icon: 🧭
    title: 不再靠大脑拼产品
    details: 把散落在标签页、路由配置和团队经验里的结构，变成一张可浏览的应用全景。
  - icon: ◫
    title: 始终面对真实界面
    details: 直接检查同源页面预览，而不是依赖注定会与代码脱节的截图。
  - icon: ⤳
    title: 让断裂的流程现形
    details: 在问题抵达用户之前，看见导航热点、页面关系和体验中的空白地带。
  - icon: ◈
    title: 让复杂度重新可读
    details: 将深层路由折叠成页面组，从产品全局顺畅进入一条具体流程。
  - icon: ✓
    title: 把测试放回业务语境
    details: 在页面旁查看保护它的单元测试、组件测试和端到端测试。
  - icon: ⏻
    title: 只理解产品，不打扰生产
    details: PageFlow 仅在开发环境运行，不会把可视化运行时交付给最终用户。
---

## 路由表，不是产品地图

应用一旦变大，真实结构就会消失在路由文件、框架约定、重定向、标签页和团队记忆里。流程图很快过期，截图逐渐与代码失联。真正昂贵的问题往往不在某个页面内部，而在页面与页面之间。

PageFlow 从正在运行的应用中重建这些上下文，让工程和产品团队共同看见：系统里有什么、用户如何移动，以及哪些路径仍缺少信心。

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
