# Integracje z frameworkami

Wybierz adapter odpowiadający routerowi aplikacji.

## Vite i Vue Router

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

Astro wykrywa trasy plikowe, kotwice tego samego źródła i jawne cele `data-pageflow-to`. Nie sprawdza wnętrza framework islands.

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

Next.js używa sidecara tego samego źródła wyłącznie do programowania:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

Sidecar nie jest używany w buildach produkcyjnych.

## uni-app

PageFlow obsługuje współczesne projekty uni-app oparte na Vite i odczytuje ich wygenerowane trasy podczas programowania.
