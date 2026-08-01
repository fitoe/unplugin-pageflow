# Vite + Vue Router

L’adaptateur Vite fournit l’intégration la plus directe pour une application Vue Router.

## Installation

```bash
pnpm add -D unplugin-pageflow
```

## Configuration

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

Démarrez Vite normalement et ouvrez l’URL PageFlow affichée dans le terminal.

## Découverte des routes

Le runtime lit `router.getRoutes()`. Il reconnaît les liens Vue Router et les destinations littérales de `router.push()` ou `router.replace()`, puis actualise les changements via Vite HMR.

## Routes dynamiques

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## État des pages

Les contrôles natifs et le défilement peuvent être restaurés automatiquement. Utilisez [`definePageFlowState`](/fr/guide/state) pour l’état Vue propre à l’application.

## Limites

- Les destinations calculées sont disponibles après leur exposition par l’application.
- L’authentification vient de la session actuelle.
- Les effets de bord d’initialisation s’exécutent dans les aperçus.
