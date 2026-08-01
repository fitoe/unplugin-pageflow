# Integrações de frameworks

Escolha o adaptador correspondente ao roteador da aplicação.

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

O Astro descobre rotas baseadas em arquivos, âncoras da mesma origem e destinos explícitos em `data-pageflow-to`. Ele não inspeciona elementos internos dos islands de frameworks.

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

O Next.js usa um sidecar da mesma origem exclusivo para desenvolvimento:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

O sidecar não é usado em builds de produção.

## uni-app

O PageFlow é compatível com projetos uni-app atuais baseados em Vite e lê suas rotas geradas durante o desenvolvimento.
