# Vite + Vue Router

L'adattatore Vite offre l'integrazione più diretta di PageFlow per un'applicazione Vue Router.

## Installazione

```bash
pnpm add -D unplugin-pageflow
```

## Configurazione

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

Avvia normalmente Vite e apri l'URL di PageFlow mostrato nel terminale.

## Rilevamento delle rotte

Il runtime di sviluppo legge `router.getRoutes()`. Riconosce i link di Vue Router e le destinazioni letterali di `router.push()` o `router.replace()`, quindi aggiorna le modifiche a rotte e link tramite Vite HMR.

## Rotte dinamiche

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Stato della pagina

I controlli nativi e le posizioni di scorrimento possono essere ripristinati automaticamente. Usa [`definePageFlowState`](/it/guide/state) per lo stato Vue specifico dell'applicazione.

## Limitazioni

- Le destinazioni calcolate diventano disponibili solo dopo che l'applicazione le espone.
- L'autenticazione proviene dalla sessione corrente del browser.
- Gli effetti collaterali dell'inizializzazione continuano a essere eseguiti nelle anteprime.
