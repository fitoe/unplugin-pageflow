# 프레임워크 통합

애플리케이션 라우터에 맞는 어댑터를 선택하세요.

## Vite와 Vue Router

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

Astro는 파일 라우트, 동일 출처 앵커와 명시적 `data-pageflow-to` 대상을 찾습니다. 프레임워크 island 내부는 분석하지 않습니다.

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

Next.js는 개발 전용 동일 출처 sidecar를 사용합니다.

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

sidecar는 프로덕션 빌드에서 사용되지 않습니다.

## uni-app

PageFlow는 현재 Vite 기반 uni-app 프로젝트를 지원하며 개발 중 생성된 라우트를 읽습니다.
