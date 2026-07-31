import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
  title: 'PageFlow',
  description: 'See every application page and navigation path on one infinite canvas.',
  base: '/unplugin-pageflow/',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['smoke-test-plan.md'],
  head: [
    ['meta', { name: 'theme-color', content: '#646cff' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Integrations', link: '/integrations/' },
      { text: 'Reference', link: '/reference/configuration' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Integrations',
        items: [
          { text: 'Framework integrations', link: '/integrations/' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Configuration', link: '/reference/configuration' },
          { text: 'Limitations and safety', link: '/reference/limitations' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/fitoe/unplugin-pageflow' },
    ],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 PageFlow contributors',
    },
  },
})
