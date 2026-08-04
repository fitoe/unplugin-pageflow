# PageFlow Chrome Extension

不改造目标项目，也不需要安装 `unplugin-pageflow`。扩展在页面主世界采集路由和 Fetch/XHR；点击 Chrome 工具栏中的 PageFlow 图标，会为当前业务标签页打开独立画板，显示页面、接口、基础诊断、截图与 Todo。

## 开发

```bash
pnpm install
pnpm --filter pageflow-chrome-extension dev
```

## 构建并安装

```bash
pnpm --filter pageflow-chrome-extension build
```

打开 `chrome://extensions`，启用开发者模式，选择“加载已解压的扩展程序”，加载 `.output/chrome-mv3`。

默认构建不申请 `debugger` 权限，接口通过页面注入采集，只能截取当前可见页面。

需要 CDP 网络采集和后台页面截图时，构建增强版：

```bash
pnpm --filter pageflow-chrome-extension build:enhanced
```

加载 `.output-enhanced/chrome-mv3`。增强版会在安装时声明 `debugger` 权限；如果 CDP 被 DevTools 占用或 attach 失败，会自动回退到页面注入采集。两个版本共享同一套 PageFlow UI 和业务代码。

源码分析、HMR 精确更新、测试发现与执行仍属于 unplugin 版本。
