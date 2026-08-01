---
layout: home

title: PageFlow
titleTemplate: 一眼看清整個應用
description: 將所有頁面和頁面之間的路徑，放在一張清晰、始終最新的畫布上。

hero:
  name: PageFlow
  text: 一眼看清整個應用。
  tagline: 頁面越來越多，導航關係也越來越難理清。PageFlow 把所有頁面和它們之間的路徑，完整呈現在一張清晰的畫布上。
  image:
    src: /pageflow-demo.svg?v=20260801-20
    alt: PageFlow 動畫地圖正在重新排列應用頁面和導航路徑
  actions:
    - theme: brand
      text: 快速開始
      link: /zh-hk/guide/getting-started
    - theme: alt
      text: 在 GitHub 查看
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: 完整網站
    details: 把所有頁面匯集在一張地圖上，即使大型網站的結構也能一眼看清。
  - icon: 🖥️
    title: 真實頁面
    details: 直接查看程式碼實際渲染的介面，不再依賴過時的截圖和圖表。
  - icon: 🔀
    title: 頁面流程
    details: 沿著頁面之間的連接，快速了解使用者從哪裡來，又能前往哪裡。
  - icon: 🔌
    title: 頁面 API
    details: 查看每個頁面呼叫了哪些 API，以及這些 API 實際傳回了甚麼。
  - icon: 🧪
    title: 頁面測試
    details: 讓測試和頁面放在一起，覆蓋情況與剩餘風險一目了然。
  - icon: 🔄
    title: 始終同步
    details: 頁面、導航、API 和測試隨開發自動更新，無需手動維護網站地圖。
---

<FrameworkGrid bundler-title="支援的打包器" title="支援的框架" link="/zh-hk/integrations/" />

## 頁面越多，全貌越難看清

應用不斷成長，卻沒有人能在一個地方看清全部。開發者閱讀路由檔案，設計師查看設計稿，測試人員跟隨測試案例，每個人只在腦中保存流程的一部分。這些視角很快就會彼此脫節。

PageFlow 讀取正在執行的應用，把真實頁面和連接關係一起排列出來。只需一個視圖，就能了解有哪些頁面、使用者能前往哪裡，以及哪些頁面已有測試。

## 幾分鐘內開始使用

```bash
pnpm add -D unplugin-pageflow
```

將 PageFlow 加入開發設定，啟動應用，然後開啟外掛程式輸出的 URL。

[閱讀快速開始指南 →](/zh-hk/guide/getting-started)

## 探索 PageFlow

### 了解工作方式

- [理解頁面、連結、熱點、預覽和路由群組](/zh-hk/guide/concepts)
- [在無限畫布上導航](/zh-hk/guide/canvas)
- [為動態路由提供安全的參數值](/zh-hk/guide/dynamic-routes)
- [保留原生控制項與應用狀態](/zh-hk/guide/state)

### 連接開發工具

- [關聯並執行頁面測試](/zh-hk/guide/page-tests)
- [透過有限渲染和快取支援大型專案](/zh-hk/guide/large-projects)
- [了解路由探索和頁面預覽的運作方式](/zh-hk/guide/how-it-works)

### 尋找答案

- [查看框架相容性](/zh-hk/reference/compatibility)
- [排查預覽、路由、導航和測試問題](/zh-hk/guide/troubleshooting)
- [閱讀常見問題](/zh-hk/guide/faq)
