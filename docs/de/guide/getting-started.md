# Erste Schritte

PageFlow ist eine visuelle Karte für Anwendungsrouten und Navigationswege, die ausschließlich für die Entwicklung bestimmt ist.

## Voraussetzungen

- Node.js 20.19 oder neuer
- Eine unterstützte Framework-Integration
- Lokale oder Testdaten für Seiten, die bei der Initialisierung Schreibvorgänge ausführen

## Installation

```bash
pnpm add -D unplugin-pageflow
```

## Vite konfigurieren

Für eine Vite-Anwendung mit Vue Router:

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

## PageFlow öffnen

Den Entwicklungsserver wie gewohnt starten:

```bash
pnpm dev
```

Das Terminal gibt die Vorschau-URL aus:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

Diese URL öffnen, um die Routenkarte zu erkunden. Zum Zoomen scrollen, die Arbeitsfläche zum Verschieben ziehen und eine Seite auswählen, um ihre Beziehungen zu untersuchen.

## Nächste Schritte

- [Eine andere Framework-Integration wählen](/de/integrations/)
- [Parameter für dynamische Routen konfigurieren](/de/reference/configuration#parameter-für-dynamische-routen)
- [Einschränkungen und Sicherheit der Vorschau prüfen](/de/reference/limitations)
