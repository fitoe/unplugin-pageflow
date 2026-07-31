# PageFlow 冒烟测试方案

## 目标

开发中用一条快速命令验证 PageFlow 的核心交互契约没有被改乱。冒烟测试只覆盖高价值主路径；完整构建、插件产物和生产剔除仍由 `pnpm run check` 验证。

## 自动化范围

| 功能 | 必须保持的行为 | 自动化证据 |
| --- | --- | --- |
| 页面组织 | uni-app 路由忽略外层 `pages`；同目录形成编组；单页不形成假编组；目标页能定位所属编组 | `layout.test.mjs` |
| 聚焦关联页 | 重复列表到同一目标只保留一条关系；关联页优先分布左右且每页只分配一次 | `layout.test.mjs` |
| 聚焦连线 | 热点中心作为连线起点；连线终点落在关联页边缘；拖动位置覆盖自动布局 | `focus-layout.test.mjs` |
| 聚焦缓存 | 首次扫描结果和拖动位置可恢复；返回值隔离；页面 revision 改变后旧缓存失效 | `layout.test.mjs` |
| 跳转 | 带 query 的真实跳转地址保留；角色匹配后注入对应预览角色；最近活动页面缓存受限 | `layout.test.mjs`、`runtime.test.mjs` |
| 缩放与拖动 | 滚轮坐标转换正确；缩放边界配置不被意外收紧 | `layout.test.mjs` |
| 页面高度 | 无限加载页面只采用一屏高度，避免空白长页 | `layout.test.mjs` |
| 快照层级 | 低缩放使用 compact，高缩放切换 full 高清快照 | `layout.test.mjs` |
| 快照队列 | 同时只保留一个调度任务；完成、取消和销毁会释放等待者与定时器 | `capture-queue.test.mjs` |
| 快照批次 | 失效页面从批次移除；可见页优先；路由顺序稳定；手动重拍抢占后台批次 | `capture-planner.test.mjs` |
| 快照生成 | 截取真实页面根节点；生成 compact；高清切片倒序保存；释放临时 Canvas | `snapshot-capture.test.mjs` |
| iframe 生命周期 | iframe 替换、移除和销毁时释放 window 索引、图片观察器与延迟重拍任务 | `preview-frame-registry.test.mjs` |
| 预览消息 | API、页面上报、热点悬停、扫描结果与带参数跳转消息被稳定解码；畸形消息被忽略 | `preview-message.test.mjs` |
| 页面热更新 | 单页更新保留已扫描聚焦链接；目标变化触发重排；仅内容变化只重绘 | `page-update.test.mjs` |
| 整图同步 | 路由模式切换重置预览；删页裁剪缓存并退出失效焦点；元数据更新不触发布局 | `graph-update.test.mjs` |
| Leafer 渲染 | 官方 Node Canvas 可布局、拾取、导出 PNG，并同步清理资源 | `leafer-node.test.mjs` |
| 场景卡片 | 页面卡片元信息、复制状态和真实页面扑克牌层级保持一致 | `scene-cards.test.mjs` |
| 节点缓存 | 签名不变复用节点；签名变化替换；离场节点销毁并从场景树删除 | `scene-node-cache.test.mjs` |
| 动画运行器 | 同类动画只运行一个；新动画取消旧动画；取消后旧完成回调不再执行 | `frame-animation.test.mjs` |
| 页面发现与热点 | Vue Router、`RouterLink`、uni-app 跳转和事件热点被发现，热点点击只通知画板且保留参数 | `runtime.test.mjs` |
| 框架路由适配 | Vue Router 的发现、路由表、动态参数、base/hash 地址和程序化导航通过统一适配器输出 | `router-adapter.test.mjs` |
| 页面状态 | query 与角色间缓存隔离；表单和滚动恢复；密码等敏感字段不保存 | `state.test.mjs` |
| 页面测试 | 测试可关联、运行、批量串行、超时和取消；结果跨重启恢复，测试文件内容变化后旧结果失效 | `page-tests.test.mjs`、`page-test-results.test.mjs`、`plugin.test.mjs` |
| 插件集成 | 开发路由、pages.json 首页折叠、标题与路由元数据、资源服务可用 | `plugin.test.mjs` |
| 快照缓存 | 磁盘缓存受大小约束；Object URL 使用 LRU 回收 | `thumbnail-cache.test.mjs`、`thumbnail-resources.test.mjs` |

## 执行分层

开发中改画布、布局、聚焦、跳转、快照逻辑后先运行：

```powershell
pnpm run test:smoke
```

提交前运行全量单元/集成测试：

```powershell
pnpm test
```

发布前运行完整门禁：

```powershell
pnpm run check
```

## 浏览器人工冒烟

涉及动画、层级、视觉或 iframe 生命周期时，自动化契约通过后仍需在真实业务项目检查：

1. 首次打开画板，所有页面逐步出现且不持续闪烁。
2. 点击编组后页面铺开并保持居中；点击画布外返回时动画连续。
3. 点击页面进入聚焦；其它页面退到周边；滚轮和拖动不自动切换焦点。
4. 聚焦页显示粉红链接热点、粉蓝事件热点；输入框和非跳转区域不出现热点。
5. 点击带参数热点，目标页进入正确编组并聚焦，query 参数保留。
6. 拖动关联小页面后连线跟随；退出再进入后位置与扫描关系恢复。
7. 放大后切换高清页面并更新快照；无限列表保持一屏高度。
8. 多角色页面使用匹配 Token；接口无权限时进入登录页，不污染其它角色页面状态。
9. 聚焦页面后右侧可在“接口 / 测试”间切换；切换焦点不串测试，修改测试文件后列表自动更新且画布不刷新。

## 维护规则

- 修复核心交互回归时，先在冒烟测试中增加最小复现，再修改实现。
- 断言用户可观察契约，不断言内部调用次数或动画逐帧细节。
- 新增关键功能时，只在会造成主流程中断或数据污染的情况下加入冒烟层。
- 真实账号、Token、密码和业务返回数据不得写入仓库测试文件。
