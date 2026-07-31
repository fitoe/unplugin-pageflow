import { addPluginTemplate, addVitePlugin, defineNuxtModule } from 'nuxt/kit'
import type { NuxtModule } from 'nuxt/schema'
import PageFlow from '../plugin/index'
import type { PageFlowOptions } from '../shared/types'

const pageflowNuxtModule: NuxtModule<PageFlowOptions> = defineNuxtModule<PageFlowOptions>({
  meta: {
    name: 'unplugin-pageflow',
    configKey: 'pageflow',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: { enabled: true },
  setup(options, nuxt) {
    if (!nuxt.options.dev || options.enabled === false) return
    addVitePlugin(PageFlow.vite({ ...options, framework: 'nuxt', projectRoot: nuxt.options.rootDir }), { server: false })
    addPluginTemplate({
      filename: 'unplugin-pageflow.client.mjs',
      mode: 'client',
      getContents: () => [
        "import { defineNuxtPlugin } from '#app/nuxt'",
        "import 'virtual:unplugin-pageflow/runtime'",
        "export default defineNuxtPlugin({ name: 'unplugin-pageflow', setup() {} })",
      ].join('\n'),
    })
  },
})

export default pageflowNuxtModule
