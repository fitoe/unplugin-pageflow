# Vite + Vue Router

The Vite adapter provides the most direct PageFlow integration for a Vue Router application.

## Install

```bash
pnpm add -D unplugin-pageflow
```

## Configure

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import PageFlow from 'unplugin-pageflow'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    PageFlow.vite(),
  ],
})
```

Start Vite normally and open the PageFlow URL printed in the terminal.

## Route discovery

The development runtime reads `router.getRoutes()`. It recognizes Vue Router links and literal `router.push()` or `router.replace()` destinations, then updates route and link changes through Vite HMR.

## Dynamic routes

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Page state

Native controls and scroll positions can be restored automatically. Use [`definePageFlowState`](/guide/state) for application-specific Vue state.

## Limitations

- Computed destinations become available only after the application exposes them.
- Authentication comes from the current browser session.
- Initialization side effects still run in previews.

