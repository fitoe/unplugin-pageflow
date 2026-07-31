# Getting started

PageFlow is a development-only visual map for application routes and navigation paths.

## Requirements

- Node.js 20.19 or newer
- A supported framework integration
- Local or test data for pages that perform writes during initialization

## Install

```bash
pnpm add -D unplugin-pageflow
```

## Configure Vite

For a Vite application using Vue Router:

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

## Open PageFlow

Start the development server as usual:

```bash
pnpm dev
```

The terminal prints the preview URL:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

Open that URL to explore the route map. Scroll to zoom, drag the canvas to move, and select a page to inspect its relationships.

## Next steps

- [Choose another framework integration](/integrations/)
- [Configure dynamic route parameters](/reference/configuration#dynamic-route-parameters)
- [Review preview limitations and safety](/reference/limitations)
