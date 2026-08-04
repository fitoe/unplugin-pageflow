# Chrome 插件

[下载 PageFlow Chrome 插件](/chrome/pageflow.crx)

插件不经过 Chrome 应用商店，安装后会定期从 PageFlow 官网检查并自动更新。

## 安装限制

- Linux：可下载 CRX，并按 Chrome 的自托管扩展方式安装。
- Windows、macOS：Chrome 不允许普通用户直接安装站外 CRX，只能由组织管理员通过 `ExtensionInstallForcelist` 等企业策略部署。
- 个人开发调试：可下载源码构建产物，在 `chrome://extensions` 开启开发者模式后“加载已解压的扩展程序”；这种方式不会使用在线自动更新。

## 更新

Chrome 每隔数小时读取插件内的 `update_url`。发现官网版本更高时，会下载同一私钥签名的 CRX 并自动替换当前版本。发布新版本前，需先提升 `packages/chrome-extension/package.json` 中的 `version`。
