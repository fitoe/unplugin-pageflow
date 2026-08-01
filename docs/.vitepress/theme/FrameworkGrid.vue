<script setup lang="ts">
defineProps<{
  title: string
  link: string
}>()

const frameworks = [
  { name: 'Vite + Vue Router', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/vuedotjs/4FC08D&w=112&h=112&fit=contain&output=png' },
  { name: 'Nuxt', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/nuxt/00DC82&w=112&h=112&fit=contain&output=png' },
  { name: 'Astro', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/astro/FF5D01&w=112&h=112&fit=contain&output=png' },
  { name: 'Next.js', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/nextdotjs/000000&w=112&h=112&fit=contain&output=png' },
  { name: 'React Router', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/reactrouter/CA4245&w=112&h=112&fit=contain&output=png' },
  { name: 'SvelteKit', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/svelte/FF3E00&w=112&h=112&fit=contain&output=png' },
  { name: 'SolidStart', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/solid/2C4F7C&w=112&h=112&fit=contain&output=png' },
  { name: 'Qwik City', icon: 'https://wsrv.nl/?url=cdn.simpleicons.org/qwik/18B6F6&w=112&h=112&fit=contain&output=png' },
  { name: 'uni-app', icon: 'https://qiniu-web-assets.dcloud.net.cn/unidoc/zh/uni-app.png' },
]
</script>

<template>
  <section class="framework-section">
    <h2>{{ title }}</h2>
    <div class="framework-grid">
      <a v-for="framework in frameworks" :key="framework.name" :href="link" class="framework-card">
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
