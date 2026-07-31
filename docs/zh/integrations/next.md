# Next.js

Next.js 不提供 Vite 插件接口，因此 PageFlow 使用仅限开发环境的同源 sidecar。

## 启动应用

将 PageFlow 安装为开发依赖，并先启动 Next.js 应用。

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## 启动 sidecar

从应用根目录运行：

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

CLI 会发现受支持的 Next.js 文件路由并输出 PageFlow 地址。

## 参数

- `--dir` 指定 Next.js 项目目录。
- `--host` 指定开发 Host。
- `--port` 指定 sidecar 设置所连接的 Next.js 开发端口。

## 仅限开发环境

Sidecar 不属于 `next build`，生产服务器也不会使用它。请把它放在本地开发脚本中，而不是生产进程定义中。

## 故障排查

- 打开页面预览前先启动 Next.js。
- 使用未被占用的 Host 和端口。
- 确认页面可在同一浏览器会话中直接打开。
- 使用本地或测试身份与数据。

