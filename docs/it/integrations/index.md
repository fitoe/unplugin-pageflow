# Integrazioni con framework

Scegli l'adattatore corrispondente al router dell'applicazione.

## Vite e Vue Router

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

Astro rileva rotte basate su file, ancore della stessa origine e destinazioni esplicite `data-pageflow-to`. Non ispeziona gli elementi interni degli island dei framework.

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

Next.js usa un sidecar della stessa origine riservato allo sviluppo:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

Il sidecar non viene usato nelle build di produzione.

## uni-app

PageFlow supporta gli attuali progetti uni-app basati su Vite e ne legge le rotte generate durante lo sviluppo.
