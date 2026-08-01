---
layout: home

title: PageFlow
titleTemplate: 一次看清整个应用
description: 把所有页面和页面之间的跳转放到一张清晰、随代码更新的画布上。

hero:
  name: PageFlow
  text: 一次看清整个应用。
  tagline: 页面越来越多，跳转越来越绕，没人能轻松说清用户会走到哪里。PageFlow 把所有页面和它们之间的去向放到一张图里。
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
    title: 所有页面，一张图
    details: 不用来回翻文件和浏览器标签，也能知道应用里到底有哪些页面。
  - icon: ◫
    title: 看到真实页面
    details: 直接预览代码实际运行出来的界面，不再依赖旧截图和流程图。
  - icon: ⤳
    title: 看清每次跳转
    details: 一个按钮会去哪里，一个页面如何进入下一个页面，都能直接看到。
  - icon: ◈
    title: 页面再多也不乱
    details: 把相关页面收进分组，从应用全貌逐步进入一条具体流程。
  - icon: ✓
    title: 找到页面对应的测试
    details: 在页面旁查看并运行相关的单元测试、组件测试和端到端测试。
  - icon: ⏻
    title: 只在开发时运行
    details: PageFlow 用来帮助开发，不会给正式上线的应用增加运行代码。
---

<FrameworkGrid title="支持的框架" link="/zh/reference/compatibility" />

## 页面越多，越难看全

应用变大后，很少有人能在一个地方看到全部内容。开发看路由文件，设计看原型，测试看用例，每个人还要在脑子里记住一部分流程。这些信息很快就会对不上。

PageFlow 直接读取正在运行的应用，把真实页面和跳转关系放在一起。打开一张图，就能知道有哪些页面、用户可以去哪里，以及每个页面有没有对应测试。

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
