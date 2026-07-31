import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'PageFlow',
  description: 'See every application page and navigation path on one infinite canvas.',
  base: process.env.VITEPRESS_BASE || '/unplugin-pageflow/',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['smoke-test-plan.md'],
  head: [
    ['meta', { name: 'theme-color', content: '#646cff' }],
  ],
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      description: '在无限画布上查看应用的所有页面和导航路径。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: '框架接入', link: '/zh/integrations/' },
          { text: '参考', link: '/zh/reference/configuration' },
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              { text: '快速开始', link: '/zh/guide/getting-started' },
            ],
          },
          {
            text: '框架接入',
            items: [
              { text: '支持的框架', link: '/zh/integrations/' },
            ],
          },
          {
            text: '参考',
            items: [
              { text: '配置', link: '/zh/reference/configuration' },
              { text: '限制与安全', link: '/zh/reference/limitations' },
            ],
          },
        ],
        outline: { label: '本页目录' },
        lastUpdated: { text: '最后更新' },
        docFooter: { prev: '上一页', next: '下一页' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: '在 GitHub 上编辑此页',
        },
        footer: {
          message: '基于 MIT 许可证发布。',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
  },
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
    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: '搜索',
                buttonAriaLabel: '搜索',
              },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '重置搜索',
                backButtonTitle: '关闭搜索',
                noResultsText: '没有找到结果',
                footer: {
                  selectText: '选择',
                  selectKeyAriaLabel: '回车',
                  navigateText: '切换',
                  navigateUpKeyAriaLabel: '上箭头',
                  navigateDownKeyAriaLabel: '下箭头',
                  closeText: '关闭',
                  closeKeyAriaLabel: 'Esc',
                },
              },
            },
          },
        },
      },
    },
    editLink: {
      pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 PageFlow contributors',
    },
  },
})
