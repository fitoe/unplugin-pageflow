# Vite + Vue Router

Der Vite-Adapter bietet die direkteste PageFlow-Integration für eine Vue-Router-Anwendung.

## Installation

```bash
pnpm add -D unplugin-pageflow
```

## Konfiguration

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

Vite wie gewohnt starten und die im Terminal ausgegebene PageFlow-URL öffnen.

## Routenerkennung

Die Entwicklungslaufzeit liest `router.getRoutes()`. Sie erkennt Vue-Router-Links und literale Ziele von `router.push()` oder `router.replace()` und aktualisiert Routen- und Linkänderungen anschließend über Vite HMR.

## Dynamische Routen

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Seitenzustand

Native Steuerelemente und Scrollpositionen können automatisch wiederhergestellt werden. Für anwendungsspezifischen Vue-Zustand [`definePageFlowState`](/de/guide/state) verwenden.

## Einschränkungen

- Berechnete Ziele werden erst verfügbar, nachdem die Anwendung sie offenlegt.
- Die Authentifizierung stammt aus der aktuellen Browsersitzung.
- Nebenwirkungen der Initialisierung werden in Vorschauen weiterhin ausgeführt.
