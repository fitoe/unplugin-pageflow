# Vite + Vue Router

Адаптер Vite забезпечує найпрямішу інтеграцію PageFlow із застосунком Vue Router.

## Установлення

```bash
pnpm add -D unplugin-pageflow
```

## Налаштування

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

Запустіть Vite звичайним способом і відкрийте URL-адресу PageFlow, надруковану в терміналі.

## Виявлення маршрутів

Середовище розробки зчитує `router.getRoutes()`. Воно розпізнає посилання Vue Router і літеральні цілі `router.push()` або `router.replace()`, а потім оновлює зміни маршрутів і посилань через Vite HMR.

## Динамічні маршрути

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Стан сторінки

Нативні елементи керування та позиції прокручування можуть відновлюватися автоматично. Для стану Vue, специфічного для застосунку, використовуйте [`definePageFlowState`](/uk/guide/state).

## Обмеження

- Обчислювані цілі стають доступними лише після того, як застосунок їх надасть.
- Автентифікація береться з поточного сеансу браузера.
- Побічні ефекти ініціалізації все одно виконуються в переглядах.
