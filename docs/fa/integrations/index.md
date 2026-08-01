# یکپارچه‌سازی فریم‌ورک‌ها

آداپتوری را انتخاب کنید که با روتر برنامه سازگار است.

## Vite و Vue Router

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

Astro مسیرهای فایل‌محور، لنگرهای هم‌مبدأ و مقصدهای صریح `data-pageflow-to` را کشف می‌کند. داخل islandهای فریم‌ورک را بررسی نمی‌کند.

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

Next.js از یک sidecar هم‌مبدأ ویژهٔ توسعه استفاده می‌کند:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

sidecar در buildهای تولید استفاده نمی‌شود.

## uni-app

PageFlow پروژه‌های امروزی uni-app مبتنی بر Vite را پشتیبانی می‌کند و هنگام توسعه مسیرهای ساخته‌شدهٔ آن‌ها را می‌خواند.
