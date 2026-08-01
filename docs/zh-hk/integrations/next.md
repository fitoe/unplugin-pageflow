# Next.js

Next.js 不提供 Vite 外掛程式介面，因此 PageFlow 使用僅限開發環境的同源 sidecar。

## 準備 PageFlow

將套件安裝為開發依賴，並確認 Next.js 應用正在執行。

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## 啟動 sidecar

在應用根目錄執行 CLI：

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

CLI 會探索受支援的 Next.js 檔案路由，並輸出 PageFlow URL。

## 選項

- `--dir` 選擇 Next.js 專案目錄。
- `--host` 選擇開發主機。
- `--port` 指定 sidecar 設定使用的 Next.js 開發連接埠。

## 僅限開發環境

sidecar 不是 `next build` 的一部分，也不會被正式伺服器使用。請把它放在本機開發指令碼，而不是正式程序定義中。

## 故障排查

- 開啟頁面預覽前先啟動 Next.js。
- 使用可用的主機與連接埠。
- 確認頁面可以在同一瀏覽器工作階段直接渲染。
- 使用本機或測試驗證與資料。
