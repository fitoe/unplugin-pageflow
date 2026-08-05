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

插件只有一个构建版本。安装时授权 `debugger` 后启用 CDP 接口采集和后台高清截图；CDP 被占用、用户中止调试或 attach 失败时，自动回退到页面注入采集和当前可见区域截图。Chrome 不允许将 `debugger` 声明为运行时可选权限。

源码分析、HMR 精确更新、测试发现与执行仍属于 unplugin 版本。
