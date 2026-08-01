# ফ্রেমওয়ার্ক ইন্টিগ্রেশন

অ্যাপ্লিকেশনের রাউটারের সঙ্গে মেলা অ্যাডাপ্টার বেছে নিন।

## Vite ও Vue Router

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

Astro ফাইল রুট, একই-অরিজিন অ্যাঙ্কর ও স্পষ্ট `data-pageflow-to` লক্ষ্য আবিষ্কার করে। এটি ফ্রেমওয়ার্ক island-এর ভেতর পরীক্ষা করে না।

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

Next.js শুধু ডেভেলপমেন্টে একই-অরিজিন sidecar ব্যবহার করে:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

প্রোডাকশন বিল্ডে sidecar ব্যবহৃত হয় না।

## uni-app

PageFlow বর্তমান Vite-ভিত্তিক uni-app প্রকল্প সমর্থন করে এবং ডেভেলপমেন্টে তৈরি রুট পড়ে।
