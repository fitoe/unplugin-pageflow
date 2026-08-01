# Vite + Vue Router

Adaptér Vite poskytuje nejpřímější integraci PageFlow pro aplikaci Vue Router.

## Instalace

```bash
pnpm add -D unplugin-pageflow
```

## Konfigurace

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

Spusťte Vite obvyklým způsobem a otevřete URL PageFlow vypsanou v terminálu.

## Zjišťování tras

Vývojový runtime čte `router.getRoutes()`. Rozpoznává odkazy Vue Router a literální cíle `router.push()` nebo `router.replace()`, poté aktualizuje změny tras a odkazů přes Vite HMR.

## Dynamické trasy

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Stav stránky

Nativní ovládací prvky a pozice posunu lze obnovovat automaticky. Pro stav Vue specifický pro aplikaci použijte [`definePageFlowState`](/cs/guide/state).

## Omezení

- Vypočítané cíle jsou dostupné až poté, co je aplikace zpřístupní.
- Ověřování pochází z aktuální relace prohlížeče.
- Vedlejší účinky inicializace se v náhledech stále spouštějí.
