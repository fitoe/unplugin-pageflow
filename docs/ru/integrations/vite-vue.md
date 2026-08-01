# Vite + Vue Router

Адаптер Vite обеспечивает наиболее прямую интеграцию PageFlow с приложением Vue Router.

## Установка

```bash
pnpm add -D unplugin-pageflow
```

## Настройка

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

Запустите Vite обычным способом и откройте URL PageFlow, выведенный в терминале.

## Обнаружение маршрутов

Среда разработки читает `router.getRoutes()`. Она распознаёт ссылки Vue Router и литеральные цели `router.push()` или `router.replace()`, а затем обновляет маршруты и ссылки через Vite HMR.

## Динамические маршруты

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## Состояние страницы

Нативные элементы и позиции прокрутки могут восстанавливаться автоматически. Для состояния Vue, специфичного для приложения, используйте [`definePageFlowState`](/ru/guide/state).

## Ограничения

- Вычисляемые цели доступны только после того, как приложение их покажет.
- Аутентификация берётся из текущей сессии браузера.
- Побочные эффекты инициализации продолжают выполняться в превью.
