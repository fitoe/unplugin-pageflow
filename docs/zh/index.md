---
layout: home

title: PageFlow
titleTemplate: 完整网站页面流
description: 用上帝视角全览整站所有页面，和页面上的接口、测试，掌握站点全貌。

hero:
  name: PageFlow
  text: 完整网站页面流
  tagline: 用上帝视角全览整站所有页面，和页面上的接口、测试，掌握站点全貌
  image:
    src: /pageflow-demo.svg
    alt: PageFlow 动画展示应用页面重组及导航路径
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 下载 Chrome 插件
      link: /chrome/pageflow.crx
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: 整站全貌
    details: 所有页面集中在一张图里，网站再大，也能快速看清整体结构。
  - icon: 🖥️
    title: 真实页面
    details: 直接查看代码实际运行出的页面，不再依赖过期的截图和流程图。
  - icon: 🔀
    title: 页面流向
    details: 清楚看到页面之间如何跳转，快速理清用户从哪里来、会去哪里。
  - icon: 🔌
    title: 页面接口
    details: 查看每个页面调用了哪些接口，以及接口实际返回了什么内容。
  - icon: 🧪
    title: 页面测试
    details: 将测试与对应页面放在一起，哪些已经覆盖、哪些仍有风险，一目了然。
  - icon: 🔄
    title: 始终同步
    details: 页面、跳转、接口和测试随开发实时更新，不再手工维护站点地图。
---

<FrameworkGrid bundler-title="支持的打包器" title="支持的框架" link="/integrations/" />

::: warning 安装限制
Chrome 仅允许 Linux 用户直接安装官网托管的 CRX；Windows 和 macOS 需要由管理员通过企业策略安装。安装后，插件会从官网自动更新。[查看安装说明 →](/guide/chrome-extension)
:::

## 页面越多，越难看全

应用变大后，很少有人能在一个地方看到全部内容。开发看路由文件，设计看原型，测试看用例，每个人还要在脑子里记住一部分流程。这些信息很快就会对不上。

PageFlow 直接读取正在运行的应用，把真实页面和跳转关系放在一起。打开一张图，就能知道有哪些页面、用户可以去哪里，以及每个页面有没有对应测试。

## 几分钟即可开始

```bash
pnpm add -D unplugin-pageflow
```

在开发配置中加入 PageFlow，启动应用，然后打开插件输出的访问地址。

[阅读快速开始指南 →](/guide/getting-started)

## 深入了解 PageFlow

### 学习基本工作流

- [理解页面、连接、热点、预览和路由组](/guide/concepts)
- [浏览无限画布](/guide/canvas)
- [为动态路由提供安全示例值](/guide/dynamic-routes)
- [恢复原生控件和应用状态](/guide/state)

### 连接开发工具

- [关联并运行页面测试](/guide/page-tests)
- [使用有界渲染和缓存支持大型项目](/guide/large-projects)
- [了解路由发现和页面预览的工作原理](/guide/how-it-works)

### 查找答案

- [查看框架兼容性](/reference/compatibility)
- [排查页面、路由、导航和测试问题](/guide/troubleshooting)
- [阅读常见问题](/guide/faq)
