import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'PageFlow',
  description: 'See every application page and navigation path on one infinite canvas.',
  base: process.env.VITEPRESS_BASE || '/unplugin-pageflow/',
  cleanUrls: true,
  ignoreDeadLinks: [/^\/chrome\/pageflow\.crx$/],
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
              { text: 'Chrome 插件', link: '/guide/chrome-extension' },
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
    uk: {
      label: 'Українська',
      lang: 'uk-UA',
      link: '/uk/',
      description: 'Переглядайте всі сторінки та шляхи навігації застосунку на одному полотні.',
      themeConfig: {
        nav: [
          { text: 'Посібник', link: '/uk/guide/getting-started' },
          { text: 'Інтеграції', link: '/uk/integrations/' },
          { text: 'Довідник', link: '/uk/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'Посібник',
            items: [
              { text: 'Початок роботи', link: '/uk/guide/getting-started' },
              { text: 'Основні поняття', link: '/uk/guide/concepts' },
              { text: 'Робота з полотном', link: '/uk/guide/canvas' },
              { text: 'Динамічні маршрути', link: '/uk/guide/dynamic-routes' },
              { text: 'Стан сторінки', link: '/uk/guide/state' },
              { text: 'Тести сторінок', link: '/uk/guide/page-tests' },
              { text: 'Великі проєкти та кешування', link: '/uk/guide/large-projects' },
              { text: 'Як працює PageFlow', link: '/uk/guide/how-it-works' },
              { text: 'Усунення несправностей', link: '/uk/guide/troubleshooting' },
              { text: 'Часті запитання', link: '/uk/guide/faq' },
            ],
          },
          {
            text: 'Інтеграції',
            items: [
              { text: 'Огляд фреймворків', link: '/uk/integrations/' },
              { text: 'Vite + Vue Router', link: '/uk/integrations/vite-vue' },
              { text: 'Next.js', link: '/uk/integrations/next' },
            ],
          },
          {
            text: 'Довідник',
            items: [
              { text: 'Сумісність', link: '/uk/reference/compatibility' },
              { text: 'Конфігурація', link: '/uk/reference/configuration' },
              { text: 'Обмеження та безпека', link: '/uk/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'На цій сторінці' },
        lastUpdated: { text: 'Останнє оновлення' },
        docFooter: { prev: 'Попередня сторінка', next: 'Наступна сторінка' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'Редагувати на GitHub',
        },
        footer: {
          message: 'Опубліковано за ліцензією MIT.',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    fr: {
      label: 'Français',
      lang: 'fr-FR',
      link: '/fr/',
      description: 'Visualisez toutes les pages et tous les parcours de votre application sur un seul canevas.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/fr/guide/getting-started' },
          { text: 'Intégrations', link: '/fr/integrations/' },
          { text: 'Référence', link: '/fr/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Bien démarrer', link: '/fr/guide/getting-started' },
              { text: 'Concepts fondamentaux', link: '/fr/guide/concepts' },
              { text: 'Utiliser le canevas', link: '/fr/guide/canvas' },
              { text: 'Routes dynamiques', link: '/fr/guide/dynamic-routes' },
              { text: 'État des pages', link: '/fr/guide/state' },
              { text: 'Tests de pages', link: '/fr/guide/page-tests' },
              { text: 'Grands projets et cache', link: '/fr/guide/large-projects' },
              { text: 'Fonctionnement', link: '/fr/guide/how-it-works' },
              { text: 'Résolution des problèmes', link: '/fr/guide/troubleshooting' },
              { text: 'Questions fréquentes', link: '/fr/guide/faq' },
            ],
          },
          {
            text: 'Intégrations',
            items: [
              { text: 'Vue d’ensemble', link: '/fr/integrations/' },
              { text: 'Vite + Vue Router', link: '/fr/integrations/vite-vue' },
              { text: 'Next.js', link: '/fr/integrations/next' },
            ],
          },
          {
            text: 'Référence',
            items: [
              { text: 'Compatibilité', link: '/fr/reference/compatibility' },
              { text: 'Configuration', link: '/fr/reference/configuration' },
              { text: 'Limites et sécurité', link: '/fr/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'Sur cette page' },
        lastUpdated: { text: 'Dernière mise à jour' },
        docFooter: { prev: 'Page précédente', next: 'Page suivante' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'Modifier sur GitHub',
        },
        footer: {
          message: 'Publié sous licence MIT.',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    de: {
      label: 'Deutsch',
      lang: 'de-DE',
      link: '/de/',
      description: 'Alle Seiten und Navigationswege der Anwendung auf einer Arbeitsfläche sehen.',
      themeConfig: {
        nav: [
          { text: 'Anleitung', link: '/de/guide/getting-started' },
          { text: 'Integrationen', link: '/de/integrations/' },
          { text: 'Referenz', link: '/de/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'Anleitung',
            items: [
              { text: 'Erste Schritte', link: '/de/guide/getting-started' },
              { text: 'Grundkonzepte', link: '/de/guide/concepts' },
              { text: 'Arbeitsfläche verwenden', link: '/de/guide/canvas' },
              { text: 'Dynamische Routen', link: '/de/guide/dynamic-routes' },
              { text: 'Seitenzustand', link: '/de/guide/state' },
              { text: 'Seitentests', link: '/de/guide/page-tests' },
              { text: 'Große Projekte und Caching', link: '/de/guide/large-projects' },
              { text: 'Funktionsweise', link: '/de/guide/how-it-works' },
              { text: 'Fehlerbehebung', link: '/de/guide/troubleshooting' },
              { text: 'Häufig gestellte Fragen', link: '/de/guide/faq' },
            ],
          },
          {
            text: 'Integrationen',
            items: [
              { text: 'Framework-Übersicht', link: '/de/integrations/' },
              { text: 'Vite + Vue Router', link: '/de/integrations/vite-vue' },
              { text: 'Next.js', link: '/de/integrations/next' },
            ],
          },
          {
            text: 'Referenz',
            items: [
              { text: 'Kompatibilität', link: '/de/reference/compatibility' },
              { text: 'Konfiguration', link: '/de/reference/configuration' },
              { text: 'Einschränkungen und Sicherheit', link: '/de/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'Auf dieser Seite' },
        lastUpdated: { text: 'Zuletzt aktualisiert' },
        docFooter: { prev: 'Vorherige Seite', next: 'Nächste Seite' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'Auf GitHub bearbeiten',
        },
        footer: {
          message: 'Veröffentlicht unter der MIT-Lizenz.',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    ko: {
      label: '한국어',
      lang: 'ko-KR',
      link: '/ko/',
      description: '애플리케이션의 모든 페이지와 탐색 경로를 하나의 캔버스에서 확인하세요.',
      themeConfig: {
        nav: [
          { text: '가이드', link: '/ko/guide/getting-started' },
          { text: '통합', link: '/ko/integrations/' },
          { text: '참조', link: '/ko/reference/compatibility' },
        ],
        sidebar: [
          {
            text: '가이드',
            items: [
              { text: '시작하기', link: '/ko/guide/getting-started' },
              { text: '핵심 개념', link: '/ko/guide/concepts' },
              { text: '캔버스 사용하기', link: '/ko/guide/canvas' },
              { text: '동적 라우트', link: '/ko/guide/dynamic-routes' },
              { text: '페이지 상태', link: '/ko/guide/state' },
              { text: '페이지 테스트', link: '/ko/guide/page-tests' },
              { text: '대규모 프로젝트와 캐시', link: '/ko/guide/large-projects' },
              { text: 'PageFlow 작동 방식', link: '/ko/guide/how-it-works' },
              { text: '문제 해결', link: '/ko/guide/troubleshooting' },
              { text: '자주 묻는 질문', link: '/ko/guide/faq' },
            ],
          },
          {
            text: '통합',
            items: [
              { text: '프레임워크 개요', link: '/ko/integrations/' },
              { text: 'Vite + Vue Router', link: '/ko/integrations/vite-vue' },
              { text: 'Next.js', link: '/ko/integrations/next' },
            ],
          },
          {
            text: '참조',
            items: [
              { text: '호환성', link: '/ko/reference/compatibility' },
              { text: '설정', link: '/ko/reference/configuration' },
              { text: '제한 사항과 안전', link: '/ko/reference/limitations' },
            ],
          },
        ],
        outline: { label: '이 페이지의 내용' },
        lastUpdated: { text: '마지막 업데이트' },
        docFooter: { prev: '이전 페이지', next: '다음 페이지' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'GitHub에서 편집',
        },
        footer: {
          message: 'MIT 라이선스로 공개됩니다.',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    pt: {
      label: 'Português',
      lang: 'pt-BR',
      link: '/pt/',
      description: 'Veja todas as páginas e os caminhos de navegação da aplicação em uma única tela.',
      themeConfig: {
        nav: [
          { text: 'Guia', link: '/pt/guide/getting-started' },
          { text: 'Integrações', link: '/pt/integrations/' },
          { text: 'Referência', link: '/pt/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'Guia',
            items: [
              { text: 'Primeiros passos', link: '/pt/guide/getting-started' },
              { text: 'Conceitos fundamentais', link: '/pt/guide/concepts' },
              { text: 'Usando a tela', link: '/pt/guide/canvas' },
              { text: 'Rotas dinâmicas', link: '/pt/guide/dynamic-routes' },
              { text: 'Estado da página', link: '/pt/guide/state' },
              { text: 'Testes de páginas', link: '/pt/guide/page-tests' },
              { text: 'Projetos grandes e cache', link: '/pt/guide/large-projects' },
              { text: 'Como o PageFlow funciona', link: '/pt/guide/how-it-works' },
              { text: 'Solução de problemas', link: '/pt/guide/troubleshooting' },
              { text: 'Perguntas frequentes', link: '/pt/guide/faq' },
            ],
          },
          {
            text: 'Integrações',
            items: [
              { text: 'Visão geral dos frameworks', link: '/pt/integrations/' },
              { text: 'Vite + Vue Router', link: '/pt/integrations/vite-vue' },
              { text: 'Next.js', link: '/pt/integrations/next' },
            ],
          },
          {
            text: 'Referência',
            items: [
              { text: 'Compatibilidade', link: '/pt/reference/compatibility' },
              { text: 'Configuração', link: '/pt/reference/configuration' },
              { text: 'Limitações e segurança', link: '/pt/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'Nesta página' },
        lastUpdated: { text: 'Última atualização' },
        docFooter: { prev: 'Página anterior', next: 'Próxima página' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'Editar no GitHub',
        },
        footer: {
          message: 'Publicado sob a licença MIT.',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    bn: {
      label: 'বাংলা',
      lang: 'bn-BD',
      link: '/bn/',
      description: 'অ্যাপ্লিকেশনের সব পৃষ্ঠা ও নেভিগেশন পথ একটি ক্যানভাসে দেখুন।',
      themeConfig: {
        nav: [
          { text: 'নির্দেশিকা', link: '/bn/guide/getting-started' },
          { text: 'ইন্টিগ্রেশন', link: '/bn/integrations/' },
          { text: 'রেফারেন্স', link: '/bn/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'নির্দেশিকা',
            items: [
              { text: 'শুরু করুন', link: '/bn/guide/getting-started' },
              { text: 'মূল ধারণা', link: '/bn/guide/concepts' },
              { text: 'ক্যানভাস ব্যবহার', link: '/bn/guide/canvas' },
              { text: 'ডায়নামিক রুট', link: '/bn/guide/dynamic-routes' },
              { text: 'পৃষ্ঠার স্টেট', link: '/bn/guide/state' },
              { text: 'পৃষ্ঠার পরীক্ষা', link: '/bn/guide/page-tests' },
              { text: 'বড় প্রকল্প ও ক্যাশ', link: '/bn/guide/large-projects' },
              { text: 'PageFlow কীভাবে কাজ করে', link: '/bn/guide/how-it-works' },
              { text: 'সমস্যা সমাধান', link: '/bn/guide/troubleshooting' },
              { text: 'সচরাচর জিজ্ঞাসিত প্রশ্ন', link: '/bn/guide/faq' },
            ],
          },
          {
            text: 'ইন্টিগ্রেশন',
            items: [
              { text: 'ফ্রেমওয়ার্ক পর্যালোচনা', link: '/bn/integrations/' },
              { text: 'Vite + Vue Router', link: '/bn/integrations/vite-vue' },
              { text: 'Next.js', link: '/bn/integrations/next' },
            ],
          },
          {
            text: 'রেফারেন্স',
            items: [
              { text: 'সামঞ্জস্য', link: '/bn/reference/compatibility' },
              { text: 'কনফিগারেশন', link: '/bn/reference/configuration' },
              { text: 'সীমাবদ্ধতা ও নিরাপত্তা', link: '/bn/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'এই পৃষ্ঠায়' },
        lastUpdated: { text: 'সর্বশেষ হালনাগাদ' },
        docFooter: { prev: 'আগের পৃষ্ঠা', next: 'পরের পৃষ্ঠা' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'GitHub-এ সম্পাদনা করুন',
        },
        footer: {
          message: 'MIT লাইসেন্সে প্রকাশিত।',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    it: {
      label: 'Italiano',
      lang: 'it-IT',
      link: '/it/',
      description: 'Visualizza tutte le pagine e i percorsi di navigazione dell’applicazione in una sola tela.',
      themeConfig: {
        nav: [
          { text: 'Guida', link: '/it/guide/getting-started' },
          { text: 'Integrazioni', link: '/it/integrations/' },
          { text: 'Riferimento', link: '/it/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'Guida',
            items: [
              { text: 'Per iniziare', link: '/it/guide/getting-started' },
              { text: 'Concetti fondamentali', link: '/it/guide/concepts' },
              { text: 'Usare la tela', link: '/it/guide/canvas' },
              { text: 'Rotte dinamiche', link: '/it/guide/dynamic-routes' },
              { text: 'Stato della pagina', link: '/it/guide/state' },
              { text: 'Test delle pagine', link: '/it/guide/page-tests' },
              { text: 'Progetti grandi e cache', link: '/it/guide/large-projects' },
              { text: 'Come funziona PageFlow', link: '/it/guide/how-it-works' },
              { text: 'Risoluzione dei problemi', link: '/it/guide/troubleshooting' },
              { text: 'Domande frequenti', link: '/it/guide/faq' },
            ],
          },
          {
            text: 'Integrazioni',
            items: [
              { text: 'Panoramica dei framework', link: '/it/integrations/' },
              { text: 'Vite + Vue Router', link: '/it/integrations/vite-vue' },
              { text: 'Next.js', link: '/it/integrations/next' },
            ],
          },
          {
            text: 'Riferimento',
            items: [
              { text: 'Compatibilità', link: '/it/reference/compatibility' },
              { text: 'Configurazione', link: '/it/reference/configuration' },
              { text: 'Limitazioni e sicurezza', link: '/it/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'In questa pagina' },
        lastUpdated: { text: 'Ultimo aggiornamento' },
        docFooter: { prev: 'Pagina precedente', next: 'Pagina successiva' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'Modifica su GitHub',
        },
        footer: {
          message: 'Pubblicato con licenza MIT.',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    fa: {
      label: 'فارسی',
      lang: 'fa-IR',
      link: '/fa/',
      description: 'همهٔ صفحه‌ها و مسیرهای ناوبری برنامه را روی یک بوم ببینید.',
      themeConfig: {
        nav: [
          { text: 'راهنما', link: '/fa/guide/getting-started' },
          { text: 'یکپارچه‌سازی‌ها', link: '/fa/integrations/' },
          { text: 'مرجع', link: '/fa/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'راهنما',
            items: [
              { text: 'شروع کار', link: '/fa/guide/getting-started' },
              { text: 'مفاهیم اصلی', link: '/fa/guide/concepts' },
              { text: 'استفاده از بوم', link: '/fa/guide/canvas' },
              { text: 'مسیرهای پویا', link: '/fa/guide/dynamic-routes' },
              { text: 'وضعیت صفحه', link: '/fa/guide/state' },
              { text: 'آزمون‌های صفحه', link: '/fa/guide/page-tests' },
              { text: 'پروژه‌های بزرگ و حافظهٔ نهان', link: '/fa/guide/large-projects' },
              { text: 'نحوهٔ کار PageFlow', link: '/fa/guide/how-it-works' },
              { text: 'رفع اشکال', link: '/fa/guide/troubleshooting' },
              { text: 'پرسش‌های متداول', link: '/fa/guide/faq' },
            ],
          },
          {
            text: 'یکپارچه‌سازی‌ها',
            items: [
              { text: 'نمای کلی فریم‌ورک‌ها', link: '/fa/integrations/' },
              { text: 'Vite + Vue Router', link: '/fa/integrations/vite-vue' },
              { text: 'Next.js', link: '/fa/integrations/next' },
            ],
          },
          {
            text: 'مرجع',
            items: [
              { text: 'سازگاری', link: '/fa/reference/compatibility' },
              { text: 'پیکربندی', link: '/fa/reference/configuration' },
              { text: 'محدودیت‌ها و ایمنی', link: '/fa/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'در این صفحه' },
        lastUpdated: { text: 'آخرین به‌روزرسانی' },
        docFooter: { prev: 'صفحهٔ قبل', next: 'صفحهٔ بعد' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'ویرایش در GitHub',
        },
        footer: {
          message: 'منتشرشده با مجوز MIT.',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    ru: {
      label: 'Русский',
      lang: 'ru-RU',
      link: '/ru/',
      description: 'Просматривайте все страницы и пути навигации приложения на одном холсте.',
      themeConfig: {
        nav: [
          { text: 'Руководство', link: '/ru/guide/getting-started' },
          { text: 'Интеграции', link: '/ru/integrations/' },
          { text: 'Справочник', link: '/ru/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'Руководство',
            items: [
              { text: 'Начало работы', link: '/ru/guide/getting-started' },
              { text: 'Основные понятия', link: '/ru/guide/concepts' },
              { text: 'Работа с холстом', link: '/ru/guide/canvas' },
              { text: 'Динамические маршруты', link: '/ru/guide/dynamic-routes' },
              { text: 'Состояние страницы', link: '/ru/guide/state' },
              { text: 'Тесты страниц', link: '/ru/guide/page-tests' },
              { text: 'Крупные проекты и кэширование', link: '/ru/guide/large-projects' },
              { text: 'Как работает PageFlow', link: '/ru/guide/how-it-works' },
              { text: 'Устранение неполадок', link: '/ru/guide/troubleshooting' },
              { text: 'Часто задаваемые вопросы', link: '/ru/guide/faq' },
            ],
          },
          {
            text: 'Интеграции',
            items: [
              { text: 'Обзор фреймворков', link: '/ru/integrations/' },
              { text: 'Vite + Vue Router', link: '/ru/integrations/vite-vue' },
              { text: 'Next.js', link: '/ru/integrations/next' },
            ],
          },
          {
            text: 'Справочник',
            items: [
              { text: 'Совместимость', link: '/ru/reference/compatibility' },
              { text: 'Конфигурация', link: '/ru/reference/configuration' },
              { text: 'Ограничения и безопасность', link: '/ru/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'На этой странице' },
        lastUpdated: { text: 'Последнее обновление' },
        docFooter: { prev: 'Предыдущая страница', next: 'Следующая страница' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'Изменить на GitHub',
        },
        footer: {
          message: 'Опубликовано по лицензии MIT.',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    cs: {
      label: 'Čeština',
      lang: 'cs-CZ',
      link: '/cs/',
      description: 'Zobrazte všechny stránky a navigační cesty aplikace na jednom plátně.',
      themeConfig: {
        nav: [
          { text: 'Průvodce', link: '/cs/guide/getting-started' },
          { text: 'Integrace', link: '/cs/integrations/' },
          { text: 'Reference', link: '/cs/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'Průvodce',
            items: [
              { text: 'Začínáme', link: '/cs/guide/getting-started' },
              { text: 'Základní pojmy', link: '/cs/guide/concepts' },
              { text: 'Používání plátna', link: '/cs/guide/canvas' },
              { text: 'Dynamické trasy', link: '/cs/guide/dynamic-routes' },
              { text: 'Stav stránky', link: '/cs/guide/state' },
              { text: 'Testy stránek', link: '/cs/guide/page-tests' },
              { text: 'Velké projekty a cache', link: '/cs/guide/large-projects' },
              { text: 'Jak PageFlow funguje', link: '/cs/guide/how-it-works' },
              { text: 'Řešení problémů', link: '/cs/guide/troubleshooting' },
              { text: 'Časté dotazy', link: '/cs/guide/faq' },
            ],
          },
          {
            text: 'Integrace',
            items: [
              { text: 'Přehled frameworků', link: '/cs/integrations/' },
              { text: 'Vite + Vue Router', link: '/cs/integrations/vite-vue' },
              { text: 'Next.js', link: '/cs/integrations/next' },
            ],
          },
          {
            text: 'Reference',
            items: [
              { text: 'Kompatibilita', link: '/cs/reference/compatibility' },
              { text: 'Konfigurace', link: '/cs/reference/configuration' },
              { text: 'Omezení a bezpečnost', link: '/cs/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'Na této stránce' },
        lastUpdated: { text: 'Naposledy aktualizováno' },
        docFooter: { prev: 'Předchozí stránka', next: 'Další stránka' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'Upravit na GitHubu',
        },
        footer: {
          message: 'Vydáno pod licencí MIT.',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    'zh-hk': {
      label: '繁體中文',
      lang: 'zh-HK',
      link: '/zh-hk/',
      description: '在一張畫布上查看應用的所有頁面和導航路徑。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh-hk/guide/getting-started' },
          { text: '框架整合', link: '/zh-hk/integrations/' },
          { text: '參考', link: '/zh-hk/reference/compatibility' },
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              { text: '快速開始', link: '/zh-hk/guide/getting-started' },
              { text: '基本概念', link: '/zh-hk/guide/concepts' },
              { text: '使用畫布', link: '/zh-hk/guide/canvas' },
              { text: '動態路由', link: '/zh-hk/guide/dynamic-routes' },
              { text: '頁面狀態', link: '/zh-hk/guide/state' },
              { text: '頁面測試', link: '/zh-hk/guide/page-tests' },
              { text: '大型專案與快取', link: '/zh-hk/guide/large-projects' },
              { text: 'PageFlow 的運作方式', link: '/zh-hk/guide/how-it-works' },
              { text: '故障排查', link: '/zh-hk/guide/troubleshooting' },
              { text: '常見問題', link: '/zh-hk/guide/faq' },
            ],
          },
          {
            text: '框架整合',
            items: [
              { text: '框架總覽', link: '/zh-hk/integrations/' },
              { text: 'Vite + Vue Router', link: '/zh-hk/integrations/vite-vue' },
              { text: 'Next.js', link: '/zh-hk/integrations/next' },
            ],
          },
          {
            text: '參考',
            items: [
              { text: '相容性', link: '/zh-hk/reference/compatibility' },
              { text: '設定', link: '/zh-hk/reference/configuration' },
              { text: '限制與安全', link: '/zh-hk/reference/limitations' },
            ],
          },
        ],
        outline: { label: '本頁內容' },
        lastUpdated: { text: '最後更新' },
        docFooter: { prev: '上一頁', next: '下一頁' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: '在 GitHub 編輯此頁',
        },
        footer: {
          message: '基於 MIT 授權條款發佈。',
          copyright: 'Copyright © 2026 PageFlow contributors',
        },
      },
    },
    pl: {
      label: 'Polski',
      lang: 'pl-PL',
      link: '/pl/',
      description: 'Zobacz wszystkie strony i ścieżki nawigacji aplikacji na jednej planszy.',
      themeConfig: {
        nav: [
          { text: 'Przewodnik', link: '/pl/guide/getting-started' },
          { text: 'Integracje', link: '/pl/integrations/' },
          { text: 'Dokumentacja', link: '/pl/reference/compatibility' },
        ],
        sidebar: [
          {
            text: 'Przewodnik',
            items: [
              { text: 'Pierwsze kroki', link: '/pl/guide/getting-started' },
              { text: 'Podstawowe pojęcia', link: '/pl/guide/concepts' },
              { text: 'Korzystanie z planszy', link: '/pl/guide/canvas' },
              { text: 'Trasy dynamiczne', link: '/pl/guide/dynamic-routes' },
              { text: 'Stan strony', link: '/pl/guide/state' },
              { text: 'Testy stron', link: '/pl/guide/page-tests' },
              { text: 'Duże projekty i pamięć podręczna', link: '/pl/guide/large-projects' },
              { text: 'Jak działa PageFlow', link: '/pl/guide/how-it-works' },
              { text: 'Rozwiązywanie problemów', link: '/pl/guide/troubleshooting' },
              { text: 'Często zadawane pytania', link: '/pl/guide/faq' },
            ],
          },
          {
            text: 'Integracje',
            items: [
              { text: 'Przegląd frameworków', link: '/pl/integrations/' },
              { text: 'Vite + Vue Router', link: '/pl/integrations/vite-vue' },
              { text: 'Next.js', link: '/pl/integrations/next' },
            ],
          },
          {
            text: 'Dokumentacja',
            items: [
              { text: 'Zgodność', link: '/pl/reference/compatibility' },
              { text: 'Konfiguracja', link: '/pl/reference/configuration' },
              { text: 'Ograniczenia i bezpieczeństwo', link: '/pl/reference/limitations' },
            ],
          },
        ],
        outline: { label: 'Na tej stronie' },
        lastUpdated: { text: 'Ostatnia aktualizacja' },
        docFooter: { prev: 'Poprzednia strona', next: 'Następna strona' },
        editLink: {
          pattern: 'https://github.com/fitoe/unplugin-pageflow/edit/master/docs/:path',
          text: 'Edytuj na GitHubie',
        },
        footer: {
          message: 'Opublikowano na licencji MIT.',
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
          { text: 'Chrome extension', link: '/en/guide/chrome-extension' },
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
