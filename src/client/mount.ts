import { createApp } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import App from '../App.vue'
import '../style.css'
import type { ResolvedPageFlowOptions } from '../shared/types'

export function mountPageFlow(target: Element | null, config: ResolvedPageFlowOptions) {
  if (!target) throw new Error('unplugin-pageflow mount target was not found')
  const storedColorMode = localStorage.getItem('unplugin-pageflow:color-mode')
  const dark = storedColorMode === 'dark' || (storedColorMode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  return createApp(App, { config }).use(ui).mount(target)
}
