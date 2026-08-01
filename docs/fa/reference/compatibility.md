# سازگاری

PageFlow به Node.js 20.19 یا جدیدتر نیاز دارد. آن را به‌عنوان وابستگی توسعه نصب کنید.

| یکپارچه‌سازی | حداقل نسخهٔ peer | منبع مسیر | توضیح |
| --- | --- | --- | --- |
| Vite + Vue Router | Vite 5, Vue 3.4, Vue Router 4 | `router.getRoutes()` | یکپارچه‌سازی کامل runtime توسعه. |
| Nuxt | Nuxt 3 | رکوردهای Vue Router | رویدادهای ناوبری Nuxt/Vue را تشخیص می‌دهد. |
| Astro | Astro 5 | مسیرهای فایل‌محور | لنگر هم‌مبدأ و `data-pageflow-to`؛ بدون داخل island. |
| React Router | شیءهای مسیر | شیءهای صریح مسیر | از `unplugin-pageflow/react-router` استفاده کنید. |
| SvelteKit | SvelteKit 2 | مسیرهای فایل‌محور | آداپتور با `sveltekit()` ترکیب می‌شود. |
| SolidStart | SolidStart | مسیرهای فایل‌محور | آداپتور با افزونهٔ Solid ترکیب می‌شود. |
| Qwik City | Qwik 1.10, Qwik City 1.10 | مسیرهای فایل‌محور | آداپتور با Qwik City و Vite ترکیب می‌شود. |
| Next.js | Next.js 15 | مسیرهای فایل‌محور | از sidecar توسعهٔ `pageflow-next` استفاده می‌کند. |
| uni-app | تنظیم امروزی مبتنی بر Vite | مسیرهای ساخته‌شده | فقط توسعه. |

## نیازمندی مرورگر

پیش‌نمایش صفحه به دسترسی iframe هم‌مبدأ و مرورگر مدرن با پشتیبانی استاندارد history، messaging و canvas نیاز دارد.

## پشتیبانی تولید

PageFlow عمداً runtime تولید ندارد. buildهای تولید نباید کلاینت یا endpointهای توسعهٔ آن را داشته باشند.

## سیاست نسخه

بازه‌های peer فریم‌ورک مرز یکپارچه‌سازی پشتیبانی‌شده را نشان می‌دهند. هنگام استفاده از نسخهٔ اصلی جدید، manifest بسته و CI را بررسی کنید.
