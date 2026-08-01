import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import unpluginPageFlow from './src/plugin'

export default defineConfig({
  plugins: [vue(), ui({ dts: false, autoImport: false, components: false, colorMode: false, router: false }), unpluginPageFlow.vite()],
  build: { outDir: 'dist/demo' },
})
