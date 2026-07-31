import PageFlow from '../../../src/nuxt/index'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-31',
  devtools: { enabled: false },
  modules: [[PageFlow, { previewPath: '/__unplugin-pageflow/' }]],
})
