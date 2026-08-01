# Начало работы

PageFlow — визуальная карта маршрутов и путей навигации приложения, предназначенная только для разработки.

## Требования

- Node.js 20.19 или новее
- Поддерживаемая интеграция с фреймворком
- Локальные или тестовые данные для страниц, выполняющих запись при инициализации

## Установка

```bash
pnpm add -D unplugin-pageflow
```

## Настройка Vite

Для приложения Vite с Vue Router:

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

## Открытие PageFlow

Запустите сервер разработки обычным способом:

```bash
pnpm dev
```

Терминал выведет URL превью:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

Откройте URL, чтобы изучить карту маршрутов. Прокручивайте для масштабирования, перетаскивайте холст для перемещения и выбирайте страницу для просмотра связей.

## Следующие шаги

- [Выберите другую интеграцию с фреймворком](/ru/integrations/)
- [Настройте параметры динамических маршрутов](/ru/reference/configuration#параметры-динамических-маршрутов)
- [Изучите ограничения и безопасность превью](/ru/reference/limitations)
