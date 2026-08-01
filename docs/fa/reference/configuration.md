# پیکربندی

گزینه‌ها را به آداپتور PageFlow بدهید:

```ts
PageFlow.vite({
  enabled: true,
  previewPath: '/__unplugin-pageflow/',
  appUrl: '/',
  dynamicParams: {
    '/products/:id': { id: 'demo-product' },
  },
})
```

## گزینه‌ها

| گزینه | پیش‌فرض | توضیح |
| --- | --- | --- |
| `enabled` | `true` | PageFlow را در سرور توسعه فعال می‌کند. |
| `previewPath` | `/__unplugin-pageflow/` | URL مورد استفادهٔ نقشهٔ بصری. |
| `appUrl` | `/` | مسیر مورد استفاده برای کشف روتر برنامه. |
| `dynamicParams` | `{}` | برای پارامترهای مسیر پویا مقدار نمونه می‌دهد. |
| `pageTests` | `{}` | glob مسیر را صریحاً با glob فایل آزمون مرتبط می‌کند. |
| `testCommands` | `{}` | اجرای هر نوع آزمون را با فرمان صریح و بدون shell فعال می‌کند. |

## آزمون‌های صفحه

PageFlow آزمون‌هایی را که مؤلفهٔ صفحه import می‌کنند، فایل آزمون هم‌نام دارند یا در مورد آزمون به مسیر کامل می‌روند خودکار مرتبط می‌کند. آزمون مبهم را می‌توان صریح نگاشت کرد:

```ts
PageFlow.vite({
  pageTests: {
    '/orders/**': ['tests/orders-*.spec.ts'],
  },
  testCommands: {
    unit: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    component: { command: 'pnpm', args: ['vitest', 'run', '{file}', '-t', '{name}'] },
    e2e: { command: 'pnpm', args: ['playwright', 'test', '{file}', '-g', '{name}'], timeoutMs: 180_000 },
  },
})
```

`{file}` و `{name}` با فایل آزمون و نام مورد فهرست‌شده جایگزین می‌شوند. فرمان‌ها از ریشهٔ پروژه با `shell: false` اجرا می‌شوند؛ هیچ فرمانی به‌طور پیش‌فرض حدس زده یا فعال نمی‌شود. مهلت پیش‌فرض هر آزمون ۱۲۰ ثانیه است و `timeoutMs` از ۱ ثانیه تا ۳۰ دقیقه می‌پذیرد.

PageFlow آخرین ۵۰۰ نتیجه را در `.unplugin-pageflow/cache/test-results.json` نگه می‌دارد. تغییر محتوای فایل آزمون، نتیجهٔ قبلی را خودکار بی‌اعتبار می‌کند. خروجی ذخیره‌شده به ۲۰ KB پایانی هر آزمون محدود است؛ پوشهٔ حافظهٔ نهان باید در Git نادیده بماند.

## پارامترهای مسیر پویا

برای رندر مسیری مانند `/products/:id`، PageFlow به مقادیر مشخص نیاز دارد:

```ts
PageFlow.vite({
  dynamicParams: {
    '/products/:id': {
      id: 'demo-product',
    },
    '/users/:userId/orders/:orderId': {
      userId: 'alice',
      orderId: 'order-100',
    },
  },
})
```

از شناسهٔ امن محلی یا آزمایشی استفاده کنید. پارامترهای پویا احراز هویت برنامه را دور نمی‌زنند.

## آمادگی پیش‌نمایش

PageFlow پیش از ثبت صفحه منتظر قلم‌ها، تصویرها و DOM آرام می‌ماند. صفحه‌ای با کار ناهمگام طولانی می‌تواند آمادگی را صریح اعلام کند:

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
