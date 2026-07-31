import { defineConfig } from 'vite'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { qwikVite } from '@builder.io/qwik/optimizer'
import { qwikCity } from '@builder.io/qwik-city/vite'
import pageflowQwikCity from '../../../src/qwik-city/index'

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [qwikCity(), qwikVite(), pageflowQwikCity()],
})
