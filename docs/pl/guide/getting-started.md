# Pierwsze kroki

PageFlow to wizualna mapa tras aplikacji i ścieżek nawigacji przeznaczona wyłącznie do programowania.

## Wymagania

- Node.js 20.19 lub nowszy
- Obsługiwana integracja z frameworkiem
- Dane lokalne lub testowe dla stron zapisujących dane podczas inicjalizacji

## Instalacja

```bash
pnpm add -D unplugin-pageflow
```

## Konfiguracja Vite

Dla aplikacji Vite używającej Vue Router:

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

## Otwieranie PageFlow

Uruchom serwer deweloperski jak zwykle:

```bash
pnpm dev
```

Terminal wyświetli URL podglądu:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

Otwórz URL, aby poznać mapę tras. Przewijaj, by zmieniać powiększenie, przeciągaj planszę, by się poruszać, i wybierz stronę, by zbadać jej relacje.

## Następne kroki

- [Wybierz inną integrację z frameworkiem](/pl/integrations/)
- [Skonfiguruj parametry tras dynamicznych](/pl/reference/configuration#parametry-tras-dynamicznych)
- [Poznaj ograniczenia i bezpieczeństwo podglądu](/pl/reference/limitations)
