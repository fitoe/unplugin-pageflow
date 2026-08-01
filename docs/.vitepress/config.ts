import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'PageFlow',
  description: 'See every application page and navigation path on one infinite canvas.',
  base: process.env.VITEPRESS_BASE || '/unplugin-pageflow/',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['smoke-test-plan.md'],
  rewrites(id) {
    if (id.startsWith('zh/')) return id.slice(3)
    if (/^(?:ja|uk|fr|de|ko|pt|bn|it|fa|ru|cs|zh-hk|pl)\//.test(id)) return id
    return `en/${id}`
  },
  head: [
    ['meta', { name: 'theme-color', content: '#646cff' }],
  ],
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      description: '在无限画布上查看应用的所有页面和导航路径。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/getting-started' },
          { text: '框架接入', link: '/integrations/' },
          { text: '参考', link: '/reference/compatibility' },
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              { text: '快速开始', link: '/guide/getting-started' },
              { text: '基本概念', link: '/guide/concepts' },
              { text: '使用画布', link: '/guide/canvas' },
              { text: '动态路由', link: '/guide/dynamic-routes' },
              { text: '页面状态恢复', link: '/guide/state' },
              { text: '页面测试', link: '/guide/page-tests' },
              { text: '大型项目与缓存', link: '/guide/large-projects' },
              { text: '工作原理', link: '/guide/how-it-works' },
              { text: '故障排查', link: '/guide/troubleshooting' },
              { text: '常见问题', link: '/guide/faq' },
            ],
          },
          {
            text: '框架接入',
            items: [
              { text: '框架总览', link: '/integrations/' },
              { text: 'Vite + Vue Router', link: '/integrations/vite-vue' },
              { text: 'Next.js', link: '/integrations/next' },
            ],
          },
          {
            text: '参考',
            items: [
              { text: '兼容性', link: '/reference/compatibility' },
              { text: '配置', link: '/reference/configuration' },
              { text: '限制与安全', link: '/reference/limitations' },
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
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
    },
    ja: {
      label: '日本語',
      lang: 'ja-JP',
      link: '/ja/',
      description: 'すべてのページと遷移経路を、一枚のキャンバスで確認できます。',
      themeConfig: {
        nav: [
          { text: 'ガイド', link: '/ja/guide/getting-started' },
          { text: 'フレームワーク連携', link: '/ja/integrations/' },
          { text: 'リファレンス', link: '/ja/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'ガイド',
            items: [
              { text: 'はじめに', link: '/ja/guide/getting-started' },
              { text: '基本概念', link: '/ja/guide/concepts' },
              { text: 'キャンバスの使い方', link: '/ja/guide/canvas' },
              { text: '動的ルート', link: '/ja/guide/dynamic-routes' },
              { text: 'ページ状態', link: '/ja/guide/state' },
              { text: 'ページテスト', link: '/ja/guide/page-tests' },
              { text: '大規模プロジェクト', link: '/ja/guide/large-projects' },
              { text: '仕組み', link: '/ja/guide/how-it-works' },
              { text: 'トラブルシューティング', link: '/ja/guide/troubleshooting' },
              { text: 'よくある質問', link: '/ja/guide/faq' },
            ],
          },
          {
            text: 'フレームワーク連携',
            items: [
              { text: '連携一覧', link: '/ja/integrations/' },
              { text: 'Vite + Vue Router', link: '/ja/integrations/vite-vue' },
              { text: 'Next.js', link: '/ja/integrations/next' },
            ],
          },
          {
            text: 'リファレンス',
            items: [
              { text: '互換性', link: '/ja/reference/compatibility' },
              { text: '設定', link: '/ja/reference/configuration' },
              { text: '制限と安全性', link: '/ja/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'このページの内容' },
        lastUpdated: { text: '最終更新' },
        docFooter: { prev: '前のページ', next: '次のページ' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'GitHub で編集',
        },
        footer: {
          message: 'MIT ライセンスで公開されています。',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/en/guide/getting-started' },
      { text: 'Integrations', link: '/en/integrations/' },
      { text: 'Reference', link: '/en/reference/compatibility' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/en/guide/getting-started' },
          { text: 'Core concepts', link: '/en/guide/concepts' },
          { text: 'Using the canvas', link: '/en/guide/canvas' },
          { text: 'Dynamic routes', link: '/en/guide/dynamic-routes' },
          { text: 'Page state', link: '/en/guide/state' },
          { text: 'Page tests', link: '/en/guide/page-tests' },
          { text: 'Large projects and caching', link: '/en/guide/large-projects' },
          { text: 'How PageFlow works', link: '/en/guide/how-it-works' },
          { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
          { text: 'FAQ', link: '/en/guide/faq' },
        ],
      },
      {
        text: 'Integrations',
        items: [
          { text: 'Framework overview', link: '/en/integrations/' },
          { text: 'Vite + Vue Router', link: '/en/integrations/vite-vue' },
          { text: 'Next.js', link: '/en/integrations/next' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Compatibility', link: '/en/reference/compatibility' },
          { text: 'Configuration', link: '/en/reference/configuration' },
          { text: 'Limitations and safety', link: '/en/reference/limitations' },
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
          root: {
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
