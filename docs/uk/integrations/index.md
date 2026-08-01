# Інтеграції з фреймворками

Виберіть адаптер, що відповідає маршрутизатору застосунку.

## Vite і Vue Router

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

Astro виявляє файлові маршрути, якорі того самого походження та явні цілі `data-pageflow-to`. Внутрішня структура islands фреймворків не аналізується.

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

Next.js використовує допоміжний процес того самого походження лише для розробки:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

У продакшн-збірках цей процес не використовується.

## uni-app

PageFlow підтримує сучасні проєкти uni-app на основі Vite та зчитує створені ними маршрути під час розробки.
