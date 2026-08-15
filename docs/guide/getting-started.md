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
PageFlow: http://localhost:5173/__unplugin-pageflow/
```

Open that URL to explore the route map. Scroll to zoom, drag the canvas to move, and select a page to inspect its relationships.

You are ready when:

- the host terminal shows the `PageFlow:` URL;
- the canvas footer reports `Routes synced`;
- search finds the application home page;
- focusing a page promotes it to a live iframe rather than a cached card.

If any item is missing, first confirm you opened the URL from the host application's terminal and restart the host dev server after changing plugin or route configuration.

## Next steps

- [Choose another framework integration](/en/integrations/)
- [Configure dynamic route parameters](/en/reference/configuration#dynamic-route-parameters)
- [Review preview limitations and safety](/en/reference/limitations)
