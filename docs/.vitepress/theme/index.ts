import DefaultTheme from 'vitepress/theme'
import FrameworkGrid from './FrameworkGrid.vue'
import ChromeInstall from './ChromeInstall.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('FrameworkGrid', FrameworkGrid)
    app.component('ChromeInstall', ChromeInstall)
  },
}
