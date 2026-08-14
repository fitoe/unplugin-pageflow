# Framework integrations

Choose the adapter that matches the application's router.

## Vite and Vue Router

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

Astro discovers file routes, same-origin anchors, and explicit `data-pageflow-to` targets. It does not inspect framework island internals.

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

Next.js uses a development-only same-origin sidecar:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

The sidecar is not used in production builds.

## uni-app

PageFlow supports current Vite-based uni-app projects and reads their generated routes during development. `pages.json` remains the authoritative page set and order; explicit `routes` only override metadata or add custom pages, and runtime reports enrich that stable set instead of replacing it.
