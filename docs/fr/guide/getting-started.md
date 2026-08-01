# Bien démarrer

PageFlow est une carte visuelle, réservée au développement, des routes et parcours de navigation d’une application.

## Prérequis

- Node.js 20.19 ou plus récent
- Une intégration de framework prise en charge
- Des données locales ou de test pour les pages qui écrivent pendant leur initialisation

## Installation

```bash
pnpm add -D unplugin-pageflow
```

## Configurer Vite

Pour une application Vite utilisant Vue Router :

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

## Ouvrir PageFlow

Démarrez normalement le serveur de développement :

```bash
pnpm dev
```

Le terminal affiche l’URL d’aperçu :

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

Ouvrez cette URL pour explorer la carte des routes. Faites défiler pour zoomer, glissez pour déplacer le canevas et sélectionnez une page pour examiner ses relations.

## Étapes suivantes

- [Choisir une autre intégration](/fr/integrations/)
- [Configurer les paramètres de routes dynamiques](/fr/reference/configuration#paramètres-de-routes-dynamiques)
- [Lire les limites et consignes de sécurité](/fr/reference/limitations)
