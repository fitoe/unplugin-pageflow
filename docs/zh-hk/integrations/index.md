# 框架整合

請選擇與應用路由器相符的配接器。

## Vite 與 Vue Router

```ts
import PageFlow from 'unplugin-pageflow'

export default defineConfig({
  plugins: [PageFlow.vite()],
})
```

## Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['unplugin-pageflow/nuxt'],
})
```

## Astro

```ts
// astro.config.mjs
import PageFlow from 'unplugin-pageflow/astro'
import { defineConfig } from 'astro/config'

export default defineConfig({ integrations: [PageFlow()] })
```

Astro 探索檔案路由、同源錨點和明確的 `data-pageflow-to` 目標，但不檢查框架 island 內部。

## React Router

```ts
import PageFlow from 'unplugin-pageflow/react-router'

export default defineConfig({
  plugins: [react(), PageFlow(routeObjects)],
})
```

## SvelteKit

```ts
import PageFlow from 'unplugin-pageflow/sveltekit'

export default defineConfig({
  plugins: [sveltekit(), ...PageFlow()],
})
```

## SolidStart

```ts
import PageFlow from 'unplugin-pageflow/solid-start'

export default defineConfig({
  plugins: [...PageFlow(), solid()],
})
```

## Qwik City

```ts
import PageFlow from 'unplugin-pageflow/qwik-city'

export default defineConfig({
  plugins: [qwikCity(), qwikVite(), PageFlow()],
})
```

## Next.js

Next.js 使用僅限開發環境的同源 sidecar：

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

正式版本不會使用 sidecar。

## uni-app

PageFlow 支援目前基於 Vite 的 uni-app 專案，並在開發期間讀取其產生的路由。
