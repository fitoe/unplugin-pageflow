import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/client/mount.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'client/mount.js',
    },
    rollupOptions: {
      external: ['vue', 'vue-router'],
    },
  },
})
