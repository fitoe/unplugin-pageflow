import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import PageFlow from '../../../src/react-router/index.ts'
import { routes } from './src/routes.js'

export default defineConfig({ plugins: [react(), PageFlow(routes)] })
