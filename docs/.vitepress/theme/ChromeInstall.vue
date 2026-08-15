<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const props = withDefaults(defineProps<{ locale?: 'en' | 'zh' }>(), { locale: 'en' })
const platform = ref<'linux' | 'desktop'>('desktop')

onMounted(() => {
  platform.value = /Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent) ? 'linux' : 'desktop'
})

const copy = computed(() => props.locale === 'zh'
  ? platform.value === 'linux'
    ? { eyebrow: '检测到 Linux', title: '下载签名 CRX', text: '可按 Chrome 自托管扩展方式安装，并从 PageFlow 官网自动更新。', action: '下载 CRX', secondary: '下载已解压 ZIP' }
    : { eyebrow: '适用于 Windows / macOS', title: '下载已解压扩展 ZIP', text: '解压后在 chrome://extensions 开启开发者模式，点击“加载已解压的扩展程序”。', action: '下载 ZIP', secondary: '查看企业策略安装' }
  : platform.value === 'linux'
    ? { eyebrow: 'Linux detected', title: 'Download the signed CRX', text: 'Install through Chrome’s self-hosted extension flow and receive automatic updates from PageFlow.', action: 'Download CRX', secondary: 'Download unpacked ZIP' }
    : { eyebrow: 'For Windows / macOS', title: 'Download the unpacked extension ZIP', text: 'Extract it, enable Developer mode at chrome://extensions, then choose “Load unpacked”.', action: 'Download ZIP', secondary: 'Enterprise policy guide' })

const primaryHref = computed(() => withBase(platform.value === 'linux' ? '/chrome/pageflow.crx' : '/chrome/pageflow.zip'))
const secondaryHref = computed(() => withBase(platform.value === 'linux' ? '/chrome/pageflow.zip' : props.locale === 'zh' ? '/guide/chrome-extension' : '/en/guide/chrome-extension'))
</script>

<template>
  <section id="chrome-install" class="chrome-install">
    <div>
      <span>{{ copy.eyebrow }}</span>
      <h2>{{ copy.title }}</h2>
      <p>{{ copy.text }}</p>
    </div>
    <nav aria-label="Chrome extension downloads">
      <a class="primary" :href="primaryHref" download>{{ copy.action }}</a>
      <a :href="secondaryHref">{{ copy.secondary }}</a>
    </nav>
  </section>
</template>
