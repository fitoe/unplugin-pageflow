/// <reference types="vite/client" />

declare const __PAGEFLOW_AXE_ENABLED__: boolean

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'virtual:unplugin-pageflow/config' {
  import type { ResolvedPageFlowOptions } from './shared/types'
  const config: ResolvedPageFlowOptions
  export default config
}
