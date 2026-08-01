# Začínáme

PageFlow je vizuální mapa tras aplikace a navigačních cest určená pouze pro vývoj.

## Požadavky

- Node.js 20.19 nebo novější
- Podporovaná integrace frameworku
- Lokální nebo testovací data pro stránky, které při inicializaci zapisují data

## Instalace

```bash
pnpm add -D unplugin-pageflow
```

## Konfigurace Vite

Pro aplikaci Vite používající Vue Router:

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

## Otevření PageFlow

Spusťte vývojový server obvyklým způsobem:

```bash
pnpm dev
```

Terminál vypíše URL náhledu:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

Otevřete URL a prozkoumejte mapu tras. Posouváním měňte přiblížení, tažením plátna se pohybujte a výběrem stránky zobrazte její vztahy.

## Další kroky

- [Vyberte jinou integraci frameworku](/cs/integrations/)
- [Nastavte parametry dynamických tras](/cs/reference/configuration#parametry-dynamických-tras)
- [Projděte omezení a bezpečnost náhledů](/cs/reference/limitations)
