# Интеграции с фреймворками

Выберите адаптер, соответствующий роутеру приложения.

## Vite и Vue Router

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

Astro обнаруживает файловые маршруты, якоря того же источника и явные цели `data-pageflow-to`. Внутреннее устройство islands фреймворков не анализируется.

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

Next.js использует sidecar того же источника только для разработки:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

Sidecar не используется в производственных сборках.

## uni-app

PageFlow поддерживает современные проекты uni-app на основе Vite и читает созданные ими маршруты во время разработки.
