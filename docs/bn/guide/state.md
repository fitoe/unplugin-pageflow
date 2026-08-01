# পৃষ্ঠার স্টেট

PageFlow দরকারি প্রিভিউ স্টেট ধরে রাখে, যাতে অন্য পৃষ্ঠা দেখলেই UI সবসময় রিসেট না হয়।

## স্বয়ংক্রিয়ভাবে পুনরুদ্ধার হওয়া স্টেট

সমর্থিত নেটিভ ইনপুট, সিলেক্ট, চেকবক্স ও স্ক্রল অবস্থান স্বয়ংক্রিয়ভাবে ধারণ ও পুনরুদ্ধার হয়। পাসওয়ার্ড, ফাইল ও ভেরিফিকেশন-কোড ফিল্ড ইচ্ছাকৃতভাবে বাদ।

## অ্যাপ্লিকেশন স্টেট নিবন্ধন

জটিল উইজেট ও ফ্রেমওয়ার্ক স্টেট `definePageFlowState` দিয়ে যুক্ত হতে পারে।

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

স্টেট ব্লকের জন্য স্থিতিশীল ও অনন্য কী ব্যবহার করুন। `get` থেকে সিরিয়ালাইজযোগ্য, অসংবেদনশীল ডেটা ফেরত দিন এবং পৃষ্ঠা মাউন্টের পর `restore` নিরাপদে কলযোগ্য রাখুন।

## বিচ্ছিন্নতা

স্টেট ও ক্যাশ করা প্রিভিউ অর্থপূর্ণ কুয়েরি স্ট্রিং ও হ্যাশসহ সম্পূর্ণ পৃষ্ঠা URL এবং প্রিভিউয়ে ব্যবহৃত PageFlow ভূমিকা অনুযায়ী আলাদা থাকে।

## নিরাপত্তা

পাসওয়ার্ড, টোকেন, ভেরিফিকেশন কোড, প্রাইভেট কী বা গ্রাহকের গোপন তথ্য নিবন্ধন করবেন না। নিবন্ধিত স্টেটকে নিরাপদ স্টোরেজ নয়, ডেভেলপমেন্ট টুলিং ডেটা ভাবুন।
