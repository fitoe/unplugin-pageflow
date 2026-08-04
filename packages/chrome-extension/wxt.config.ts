import ui from '@nuxt/ui/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'wxt'

const enhanced = process.env.PAGEFLOW_CHROME_ENHANCED === '1'
const pageFlowIcons = [
  'i-lucide-box',
  'i-lucide-chevron-down',
  'i-lucide-chevron-up',
  'i-lucide-code-2',
  'i-lucide-download',
  'i-lucide-file-code-2',
  'i-lucide-gauge',
  'i-lucide-monitor',
  'i-lucide-moon',
  'i-lucide-play',
  'i-lucide-refresh-cw',
  'i-lucide-search',
  'i-lucide-smartphone',
  'i-lucide-sparkles',
  'i-lucide-square',
  'i-lucide-square-mouse-pointer',
  'i-lucide-sun',
  'i-lucide-tablet',
  'i-lucide-zap',
]

function nuxtUiWxtCompat(): Plugin {
  return {
    name: 'pageflow:nuxt-ui-wxt-compat',
    enforce: 'post',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/@nuxt/ui/dist/runtime/vue/stubs/none.js')) return

      return `${code}
export { defineComponent, onServerPrefetch } from 'vue'
export async function useAsyncData(_key, handler) {
  return { data: ref(await handler()), error: ref(null), pending: ref(false) }
}`
    },
  }
}

function pageFlowIconCss(): Plugin {
  const iconSet = JSON.parse(readFileSync(fileURLToPath(import.meta.resolve('@iconify-json/lucide/icons.json')), 'utf8')) as {
    width?: number
    height?: number
    icons: Record<string, { body: string, width?: number, height?: number }>
    aliases?: Record<string, { parent: string, width?: number, height?: number }>
  }
  const css = pageFlowIcons.map((iconName) => {
    const name = iconName.replace('i-lucide-', '')
    const alias = iconSet.aliases?.[name]
    const icon = iconSet.icons[name] ?? (alias ? { ...iconSet.icons[alias.parent], ...alias } : undefined)
    if (!icon) throw new Error(`Missing Lucide icon: ${name}`)
    const width = icon.width ?? iconSet.width ?? 24
    const height = icon.height ?? iconSet.height ?? 24
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${icon.body}</svg>`
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`
    return `.${iconName},[class~="undefined${iconName}"]{display:inline-block;background-color:currentColor;mask:url("${dataUrl}") no-repeat center/100% 100%;-webkit-mask:url("${dataUrl}") no-repeat center/100% 100%}`
  }).join('\n')
  return {
    name: 'pageflow:icon-css',
    resolveId: id => id === 'virtual:pageflow-icon-css' ? '\0virtual:pageflow-icon-css.css' : undefined,
    load: id => id === '\0virtual:pageflow-icon-css.css' ? css : undefined,
  }
}

export default defineConfig({
  outDir: enhanced ? '.output-enhanced' : '.output',
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    define: {
      __PAGEFLOW_CHROME_ENHANCED__: JSON.stringify(enhanced),
    },
    resolve: {
      alias: {
        '#build/nuxt-icon-client-bundle': 'virtual:nuxt-ui-icons',
        'wxt/utils/storage': fileURLToPath(import.meta.resolve('wxt/utils/storage')),
      },
    },
    plugins: [
      pageFlowIconCss(),
      nuxtUiWxtCompat(),
      ui({
        dts: false,
        autoImport: false,
        components: false,
        colorMode: false,
        icon: { mode: 'css', clientBundle: false },
        router: false,
      }),
    ],
  }),
  manifest: {
    name: 'PageFlow',
    description: '在独立画板中查看页面流、接口、诊断和 Todo。',
    action: { default_title: '打开 PageFlow' },
    permissions: enhanced ? ['storage', 'unlimitedStorage', 'tabs', 'debugger'] : ['storage', 'unlimitedStorage', 'tabs'],
    host_permissions: ['<all_urls>'],
  },
})
