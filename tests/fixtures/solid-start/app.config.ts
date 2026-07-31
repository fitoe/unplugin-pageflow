import { defineConfig } from '@solidjs/start/config'
import PageFlow from '../../../dist/solid-start/index.js'

export default defineConfig({ ssr: false, vite: { plugins: [PageFlow()] } })
