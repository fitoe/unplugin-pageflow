# شروع کار

PageFlow یک نقشهٔ بصری ویژهٔ توسعه برای مسیرها و راه‌های ناوبری برنامه است.

## نیازمندی‌ها

- Node.js 20.19 یا جدیدتر
- یک یکپارچه‌سازی فریم‌ورک پشتیبانی‌شده
- دادهٔ محلی یا آزمایشی برای صفحه‌هایی که هنگام مقداردهی اولیه داده می‌نویسند

## نصب

```bash
pnpm add -D unplugin-pageflow
```

## پیکربندی Vite

برای برنامهٔ Vite با Vue Router:

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

## بازکردن PageFlow

سرور توسعه را مانند همیشه اجرا کنید:

```bash
pnpm dev
```

ترمینال URL پیش‌نمایش را نمایش می‌دهد:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

این URL را باز کنید تا نقشهٔ مسیرها را ببینید. برای بزرگ‌نمایی اسکرول کنید، برای حرکت بوم را بکشید و برای بررسی ارتباط‌ها یک صفحه را انتخاب کنید.

## گام‌های بعدی

- [یک یکپارچه‌سازی دیگر انتخاب کنید](/fa/integrations/)
- [پارامترهای مسیر پویا را پیکربندی کنید](/fa/reference/configuration#پارامترهای-مسیر-پویا)
- [محدودیت‌ها و ایمنی پیش‌نمایش را بررسی کنید](/fa/reference/limitations)
