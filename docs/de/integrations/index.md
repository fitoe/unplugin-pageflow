# Framework-Integrationen

Den Adapter wählen, der zum Router der Anwendung passt.

## Vite und Vue Router

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

Astro erkennt dateibasierte Routen, Same-Origin-Anker und explizite `data-pageflow-to`-Ziele. Interna von Framework Islands werden nicht untersucht.

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

Next.js verwendet einen Same-Origin-Sidecar ausschließlich für die Entwicklung:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

Der Sidecar wird in Produktions-Builds nicht verwendet.

## uni-app

PageFlow unterstützt aktuelle Vite-basierte uni-app-Projekte und liest deren erzeugte Routen während der Entwicklung.
