# Vite + Vue Router

آداپتور Vite مستقیم‌ترین یکپارچه‌سازی PageFlow را برای برنامهٔ Vue Router فراهم می‌کند.

## نصب

```bash
pnpm add -D unplugin-pageflow
```

## پیکربندی

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

Vite را معمولی اجرا کنید و URLِ PageFlow چاپ‌شده در ترمینال را باز کنید.

## کشف مسیر

runtime توسعه `router.getRoutes()` را می‌خواند. پیوندهای Vue Router و مقصدهای صریح `router.push()` یا `router.replace()` را تشخیص می‌دهد، سپس تغییرات مسیر و پیوند را از طریق Vite HMR به‌روز می‌کند.

## مسیرهای پویا

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## وضعیت صفحه

کنترل‌های بومی و موقعیت اسکرول می‌توانند خودکار بازیابی شوند. برای وضعیت ویژهٔ Vue برنامه از [`definePageFlowState`](/fa/guide/state) استفاده کنید.

## محدودیت‌ها

- مقصدهای محاسبه‌شده تنها پس از آشکارشدن توسط برنامه در دسترس‌اند.
- احراز هویت از نشست فعلی مرورگر می‌آید.
- عوارض مقداردهی اولیه در پیش‌نمایش نیز اجرا می‌شوند.
