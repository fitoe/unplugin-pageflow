import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import PageFlow from '../../../src/sveltekit/index.ts'
export default defineConfig({ plugins: [sveltekit(), PageFlow()] })
