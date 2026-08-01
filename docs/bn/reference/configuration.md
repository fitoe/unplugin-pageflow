# কনফিগারেশন

PageFlow অ্যাডাপ্টারে অপশন দিন:

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

## অপশন

| অপশন | ডিফল্ট | বিবরণ |
| --- | --- | --- |
| `enabled` | `true` | ডেভেলপমেন্ট সার্ভারে PageFlow চালু করে। |
| `previewPath` | `/__unplugin-pageflow/` | ভিজ্যুয়াল মানচিত্রের URL। |
| `appUrl` | `/` | অ্যাপ্লিকেশন রাউটার আবিষ্কারের রুট। |
| `dynamicParams` | `{}` | ডায়নামিক রুট প্যারামিটারের নমুনা মান দেয়। |
| `pageTests` | `{}` | রুট glob স্পষ্টভাবে টেস্ট ফাইল glob-এর সঙ্গে যুক্ত করে। |
| `testCommands` | `{}` | স্পষ্ট shell-বিহীন কমান্ড দিয়ে প্রতি টেস্ট ধরন চালু করে। |

## পৃষ্ঠার পরীক্ষা

PageFlow কোনো পৃষ্ঠা কম্পোনেন্ট import করা, একই নামের টেস্ট ফাইল ব্যবহার করা বা টেস্ট কেসে সম্পূর্ণ রুটে যাওয়া পরীক্ষা স্বয়ংক্রিয়ভাবে যুক্ত করে। অস্পষ্ট পরীক্ষা স্পষ্টভাবে ম্যাপ করা যায়:

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

`{file}` ও `{name}` ইনডেক্স করা টেস্ট ফাইল ও কেসের নাম দিয়ে প্রতিস্থাপিত হয়। কমান্ড প্রকল্পের রুট থেকে `shell: false` দিয়ে চলে; ডিফল্টভাবে কোনো টেস্ট কমান্ড অনুমান বা সক্রিয় হয় না। একটি পরীক্ষা ডিফল্টভাবে ১২০ সেকেন্ড চলতে পারে; `timeoutMs` ১ সেকেন্ড থেকে ৩০ মিনিটের সীমা দেয়।

PageFlow সর্বশেষ ৫০০ ফলাফল `.unplugin-pageflow/cache/test-results.json`-এ রাখে। টেস্ট ফাইলের বিষয়বস্তু বদলালে আগের ফলাফল অকার্যকর হয়। সংরক্ষিত আউটপুট প্রতি পরীক্ষার শেষ ২০ KB-তে সীমিত; ক্যাশ ডিরেক্টরি Git-এ উপেক্ষিত রাখুন।

## ডায়নামিক রুট প্যারামিটার

`/products/:id`-এর মতো রুট রেন্ডার করতে PageFlow-এর নির্দিষ্ট মান দরকার:

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

নিরাপদ লোকাল বা টেস্ট পরিচয় ব্যবহার করুন। ডায়নামিক প্যারামিটার অ্যাপ্লিকেশন অথেনটিকেশন এড়ায় না।

## প্রিভিউ প্রস্তুতি

পৃষ্ঠা ধারণের আগে PageFlow ফন্ট, ছবি ও স্থির DOM-এর জন্য অপেক্ষা করে। দীর্ঘ অ্যাসিঙ্ক্রোনাস কাজের পৃষ্ঠা স্পষ্টভাবে প্রস্তুতি জানাতে পারে:

```ts
window.__UNPLUGIN_PAGEFLOW_READY__?.()
```
