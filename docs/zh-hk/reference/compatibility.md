# 相容性

PageFlow 需要 Node.js 20.19 或更高版本。請將它安裝為開發依賴。

| 整合 | 最低 peer 版本 | 路由來源 | 說明 |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | 完整的開發執行階段整合。 |
| Nuxt | Nuxt 3 | Vue Router 記錄 | 識別 Nuxt/Vue 導航事件。 |
| Astro | Astro 5 | 檔案路由 | 同源錨點和 `data-pageflow-to`；不檢查 island 內部。 |
| React Router | 路由物件 | 明確路由物件 | 使用 `unplugin-pageflow/react-router`。 |
| SvelteKit | SvelteKit 2 | 檔案路由 | 配接器與 `sveltekit()` 組合。 |
| SolidStart | SolidStart | 檔案路由 | 配接器與 Solid 外掛程式組合。 |
| Qwik City | Qwik 1.10, Qwik City 1.10 | 檔案路由 | 配接器與 Qwik City 和 Vite 組合。 |
| Next.js | Next.js 15 | 檔案路由 | 使用開發 sidecar `pageflow-next`。 |
| uni-app | 目前基於 Vite 的設定 | 產生的路由 | 僅限開發。 |

## 瀏覽器要求

頁面預覽需要同源 iframe 存取，以及支援標準 history、messaging 和 canvas 的現代瀏覽器。

## 正式環境支援

PageFlow 刻意不提供正式執行階段。正式版本不應包含它的用戶端或開發端點。

## 版本政策

框架 peer 範圍描述受支援的整合邊界。採用新的框架主要版本時，請檢查套件 manifest 和 CI。
