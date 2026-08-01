# Vite + Vue Router

Adapter Vite zapewnia najbardziej bezpośrednią integrację PageFlow dla aplikacji Vue Router.

## Instalacja

```bash
pnpm add -D unplugin-pageflow
```

## Konfiguracja

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

Uruchom Vite jak zwykle i otwórz URL PageFlow wyświetlony w terminalu.

## Wykrywanie tras

Runtime deweloperski odczytuje `router.getRoutes()`. Rozpoznaje linki Vue Router i literalne cele `router.push()` lub `router.replace()`, a następnie aktualizuje zmiany tras i linków przez Vite HMR.

## Trasy dynamiczne

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Stan strony

Natywne kontrolki i pozycje przewijania mogą być przywracane automatycznie. Dla stanu Vue specyficznego dla aplikacji użyj [`definePageFlowState`](/pl/guide/state).

## Ograniczenia

- Obliczane cele są dostępne dopiero po udostępnieniu przez aplikację.
- Uwierzytelnianie pochodzi z bieżącej sesji przeglądarki.
- Skutki uboczne inicjalizacji nadal działają w podglądach.
