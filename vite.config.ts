import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import unpluginPageFlow from './src/plugin/index.ts'
import { resolvePageFlowVersion } from './scripts/pageflow-version.mjs'

export default defineConfig({
  define: { __PAGEFLOW_VERSION__: JSON.stringify(resolvePageFlowVersion()) },
  plugins: [vue(), ui({ dts: false, autoImport: false, components: false, colorMode: false, router: false }), unpluginPageFlow.vite()],
  build: { outDir: 'dist/demo' },
})
