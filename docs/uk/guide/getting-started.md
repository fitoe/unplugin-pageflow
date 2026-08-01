# Початок роботи

PageFlow — інструмент розробки для візуалізації маршрутів застосунку та шляхів навігації.

## Вимоги

- Node.js 20.19 або новіший
- Підтримувана інтеграція фреймворку
- Локальні або тестові дані для сторінок, що виконують запис під час ініціалізації

## Встановлення

```bash
pnpm add -D unplugin-pageflow
```

## Налаштування Vite

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

## Відкриття PageFlow

```bash
pnpm dev
```

Термінал покаже URL попереднього перегляду:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

Відкрийте URL, масштабуйте колесом, перетягуйте полотно та вибирайте сторінки, щоб переглядати їхні зв’язки.

## Далі

- [Інші інтеграції](/uk/integrations/)
- [Параметри динамічних маршрутів](/uk/reference/configuration#параметри-динамічних-маршрутів)
- [Обмеження та безпека](/uk/reference/limitations)
