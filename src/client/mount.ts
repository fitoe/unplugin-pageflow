import { createApp } from 'vue'
import App from '../App.vue'
import '../style.css'
import type { ResolvedPageFlowOptions } from '../shared/types'

export function mountPageFlow(target: Element | null, config: ResolvedPageFlowOptions) {
  if (!target) throw new Error('unplugin-pageflow mount target was not found')
  return createApp(App, { config }).mount(target)
}
