import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import unpluginPageFlow from './src/plugin'

export default defineConfig({
  plugins: [vue(), unpluginPageFlow.vite()],
  build: { outDir: 'dist/demo' },
})
