# শুরু করুন

PageFlow হলো অ্যাপ্লিকেশনের রুট ও নেভিগেশন পথের একটি ডেভেলপমেন্ট-শুধু ভিজ্যুয়াল মানচিত্র।

## প্রয়োজনীয়তা

- Node.js 20.19 বা নতুন
- একটি সমর্থিত ফ্রেমওয়ার্ক ইন্টিগ্রেশন
- ইনিশিয়ালাইজেশনের সময় ডেটা লেখে এমন পৃষ্ঠার জন্য লোকাল বা টেস্ট ডেটা

## ইনস্টল করুন

```bash
pnpm add -D unplugin-pageflow
```

## Vite কনফিগার করুন

Vue Router ব্যবহার করা Vite অ্যাপ্লিকেশনের জন্য:

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

## PageFlow খুলুন

স্বাভাবিকভাবে ডেভেলপমেন্ট সার্ভার চালু করুন:

```bash
pnpm dev
```

টার্মিনাল প্রিভিউ URL দেখাবে:

```text
unplugin-pageflow  http://localhost:5173/__unplugin-pageflow/
```

রুট মানচিত্র দেখতে URLটি খুলুন। জুম করতে স্ক্রল করুন, চলতে ক্যানভাস টানুন এবং সম্পর্ক দেখতে একটি পৃষ্ঠা নির্বাচন করুন।

## পরবর্তী ধাপ

- [অন্য ফ্রেমওয়ার্ক ইন্টিগ্রেশন বেছে নিন](/bn/integrations/)
- [ডায়নামিক রুট প্যারামিটার কনফিগার করুন](/bn/reference/configuration#ডায়নামিক-রুট-প্যারামিটার)
- [প্রিভিউয়ের সীমাবদ্ধতা ও নিরাপত্তা দেখুন](/bn/reference/limitations)
