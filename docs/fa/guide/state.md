# وضعیت صفحه

PageFlow وضعیت مفید پیش‌نمایش را نگه می‌دارد تا بررسی صفحه‌ای دیگر همیشه رابط را بازنشانی نکند.

## وضعیت بازیابی‌شدهٔ خودکار

ورودی‌های بومی پشتیبانی‌شده، selectها، checkboxها و موقعیت اسکرول خودکار ثبت و بازیابی می‌شوند. فیلدهای رمز عبور، فایل و کد تأیید عمداً کنار گذاشته می‌شوند.

## ثبت وضعیت برنامه

ویجت‌های پیچیده و وضعیت فریم‌ورک می‌توانند با `definePageFlowState` مشارکت کنند.

```ts
import { onUnmounted, ref } from 'vue'
import { definePageFlowState } from 'unplugin-pageflow/runtime-state'

const activeTab = ref('overview')
const selectedRole = ref('farmer')

const stop = definePageFlowState('page-options', {
  get: () => ({
    activeTab: activeTab.value,
    selectedRole: selectedRole.value,
  }),
  restore: (state) => {
    activeTab.value = state.activeTab
    selectedRole.value = state.selectedRole
  },
})

onUnmounted(stop)
```

برای بلوک وضعیت کلیدی پایدار و یکتا استفاده کنید. در `get` دادهٔ قابل سریال‌سازی و غیرحساس برگردانید و `restore` را پس از mount صفحه ایمن نگه دارید.

## جداسازی

وضعیت و پیش‌نمایش‌های ذخیره‌شده بر اساس URL کامل صفحه، شامل رشتهٔ پرس‌وجو و هش معنادار، و نقش PageFlow مورد استفاده جدا می‌شوند.

## امنیت

هرگز رمز عبور، token، کد تأیید، کلید خصوصی یا اطلاعات محرمانهٔ مشتری را ثبت نکنید. وضعیت ثبت‌شده را دادهٔ ابزار توسعه بدانید، نه فضای ذخیره‌سازی امن.
