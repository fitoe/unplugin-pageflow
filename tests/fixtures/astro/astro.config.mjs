import { defineConfig } from 'astro/config'
import PageFlow from '../../../src/astro/index.ts'

export default defineConfig({
  integrations: [PageFlow()],
})
