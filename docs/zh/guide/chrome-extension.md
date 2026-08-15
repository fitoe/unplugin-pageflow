# Chrome 插件

[下载已解压扩展 ZIP](/chrome/pageflow.zip) · [Linux 下载签名 CRX](/chrome/pageflow.crx)

插件不经过 Chrome 应用商店，安装后会定期从 PageFlow 官网检查并自动更新。

插件安装或升级时会请求 `debugger` 权限。授权后启用 CDP 接口采集和后台高清截图；CDP 被占用、用户中止调试或连接失败时，自动使用标准页面注入采集。Chrome 不允许将 `debugger` 设为运行时可选权限。

## 安装限制

- Windows、macOS：下载并解压 ZIP，打开 `chrome://extensions`，开启“开发者模式”，点击“加载已解压的扩展程序”并选择解压后的目录。下载新 ZIP 后需要手动重新加载。
- Linux：下载 CRX，并按 Chrome 的自托管扩展方式安装；签名版本支持在线自动更新。
- 企业用户：通过 `ExtensionInstallForcelist` 或同类浏览器策略部署签名 CRX 与更新地址。
- 本地开发：构建源码后，直接加载 `packages/chrome-extension/.output/chrome-mv3`。

插件只读取你主动用 PageFlow 打开的当前标签页。`debugger` 权限用于查看页面请求和后台高清截图；除非你主动导出，否则捕获的页面状态保留在浏览器本地。

## 更新

Chrome 每隔数小时读取插件内的 `update_url`。发现官网版本更高时，会下载同一私钥签名的 CRX 并自动替换当前版本。版本号由根包 SemVer 和 Git 提交数自动生成。
