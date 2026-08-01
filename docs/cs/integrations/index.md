# Integrace frameworků

Vyberte adaptér odpovídající routeru aplikace.

## Vite a Vue Router

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

Astro zjišťuje souborové trasy, kotvy stejného původu a explicitní cíle `data-pageflow-to`. Nekontroluje vnitřní strukturu framework islands.

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

Next.js používá vývojový sidecar stejného původu:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

Sidecar se v produkčních sestaveních nepoužívá.

## uni-app

PageFlow podporuje současné projekty uni-app založené na Vite a během vývoje čte jejich vygenerované trasy.
