<script setup lang="ts">
import { withBase } from 'vitepress'

defineProps<{
  title: string
  bundlerTitle: string
  link: string
}>()

const bundlers = [
  { name: 'Vite', href: 'https://vite.dev/', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/vite/646CFF&w=112&h=112&fit=contain&output=png' },
  { name: 'Rollup', href: 'https://rollupjs.org/', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/rollupdotjs/EC4A3F&w=112&h=112&fit=contain&output=png' },
  { name: 'webpack', href: 'https://webpack.js.org/', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/webpack/8DD6F9&w=112&h=112&fit=contain&output=png' },
  { name: 'Rspack', href: 'https://rspack.rs/', icon: 'https://wsrv.nl/?url=assets.rspack.rs/rspack/rspack-logo.svg&w=112&h=112&fit=contain&output=png' },
  { name: 'esbuild', href: 'https://esbuild.github.io/', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/esbuild/FFCF00&w=112&h=112&fit=contain&output=png' },
  { name: 'Rolldown', href: 'https://rolldown.rs/', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/rolldown/FF3E00&w=112&h=112&fit=contain&output=png' },
]

const frameworks = [
  { name: 'Vite + Vue Router', anchor: 'vite-and-vue-router', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/vuedotjs/4FC08D&w=112&h=112&fit=contain&output=png' },
  { name: 'Nuxt', anchor: 'nuxt', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/nuxt/00DC82&w=112&h=112&fit=contain&output=png' },
  { name: 'Astro', anchor: 'astro', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/astro/FF5D01&w=112&h=112&fit=contain&output=png' },
  { name: 'Next.js', anchor: 'next-js', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/nextdotjs/000000&w=112&h=112&fit=contain&output=png' },
  { name: 'React Router', anchor: 'react-router', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/reactrouter/CA4245&w=112&h=112&fit=contain&output=png' },
  { name: 'SvelteKit', anchor: 'sveltekit', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/svelte/FF3E00&w=112&h=112&fit=contain&output=png' },
  { name: 'SolidStart', anchor: 'solidstart', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/solid/2C4F7C&w=112&h=112&fit=contain&output=png' },
  { name: 'Qwik City', anchor: 'qwik-city', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/qwik/18B6F6&w=112&h=112&fit=contain&output=png' },
  { name: 'uni-app', anchor: 'uni-app', icon: 'https://qiniu-web-assets.dcloud.net.cn/unidoc/zh/uni-app.png' },
]
</script>

<template>
  <section class="framework-section">
    <h2>{{ bundlerTitle }}</h2>
    <div class="bundler-grid">
      <a v-for="bundler in bundlers" :key="bundler.name" :href="bundler.href" class="framework-card">
        <span class="framework-icon"><img :src="bundler.icon" :alt="`${bundler.name} logo`" loading="lazy"></span>
        <strong>{{ bundler.name }}</strong>
      </a>
    </div>
    <h2>{{ title }}</h2>
    <div class="framework-grid">
      <a v-for="framework in frameworks" :key="framework.name" :href="withBase(`${link}#${framework.anchor}`)" class="framework-card">
        <span class="framework-icon"><img :src="framework.icon" :alt="`${framework.name} logo`" loading="lazy"></span>
        <strong>{{ framework.name }}</strong>
      </a>
    </div>
  </section>
</template>

<style scoped>
.framework-section {
  margin: 12px 0 40px;
}

.framework-section h2 {
  margin: 0 0 18px;
  border: 0;
  text-align: center;
}

.bundler-grid {
  display: grid;
  grid-auto-columns: minmax(88px, 112px);
  grid-auto-flow: column;
  justify-content: center;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 32px;
  padding-bottom: 8px;
}

.framework-grid {
  display: grid;
  grid-auto-columns: minmax(88px, 1fr);
  grid-auto-flow: column;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.framework-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 160ms ease, transform 160ms ease;
}

.framework-card:hover {
  color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.framework-icon {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
}

.framework-icon img {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.framework-card strong {
  overflow: hidden;
  max-width: 100%;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
