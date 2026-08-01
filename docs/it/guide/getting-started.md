# Per iniziare

PageFlow è una mappa visiva, riservata allo sviluppo, delle rotte e dei percorsi di navigazione di un'applicazione.

## Requisiti

- Node.js 20.19 o successivo
- Un'integrazione con framework supportata
- Dati locali o di test per le pagine che eseguono scritture durante l'inizializzazione

## Installazione

```bash
pnpm add -D unplugin-pageflow
```

## Configurare Vite

Per un'applicazione Vite che usa Vue Router:

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

## Aprire PageFlow

Avvia normalmente il server di sviluppo:

```bash
pnpm dev
```

Il terminale mostra l'URL dell'anteprima:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

Apri l'URL per esplorare la mappa delle rotte. Scorri per ingrandire, trascina la tela per spostarti e seleziona una pagina per esaminarne le relazioni.

## Passi successivi

- [Scegli un'altra integrazione con framework](/it/integrations/)
- [Configura i parametri delle rotte dinamiche](/it/reference/configuration#parametri-delle-rotte-dinamiche)
- [Consulta limitazioni e sicurezza delle anteprime](/it/reference/limitations)
