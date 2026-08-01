# フレームワーク連携

アプリケーションのルーターに合うアダプターを選びます。

## Vite と Vue Router

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

Astro はファイルルート、同一オリジンのアンカー、明示的な `data-pageflow-to` を検出します。フレームワーク island の内部は検査しません。

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

Next.js は開発専用の同一オリジン sidecar を使います。

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

sidecar は本番ビルドでは使われません。

## uni-app

PageFlow は現在の Vite ベースの uni-app プロジェクトに対応し、開発中に生成ルートを読み取ります。
