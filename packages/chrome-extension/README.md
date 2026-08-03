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

扩展不申请 `debugger` 权限。源码分析、HMR 精确更新、测试发现与执行仍属于 unplugin 版本。
