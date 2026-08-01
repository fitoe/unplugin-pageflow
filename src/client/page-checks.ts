import type { PageFlowPage, PageFlowPageTest } from '../shared/types'

export type PageFlowPageCheckStatus = 'passed' | 'failed' | 'uncovered'

export interface PageFlowPageCheck {
  id: 'entry' | 'links' | 'self-links' | 'tests'
  title: string
  description: string
  status: PageFlowPageCheckStatus
}

function internalTarget(target: string) {
  const value = target.trim()
  if (!value || value.startsWith('#') || /^(?:https?:|mailto:|tel:|javascript:)/i.test(value)) return
  return value.split(/[?#]/, 1)[0]
}

function targetPageId(target: string, pages: PageFlowPage[]) {
  const value = internalTarget(target)
  if (!value) return
  return pages.find(page => page.id === value || page.path === value)?.id
}

export function createPageChecks(page: PageFlowPage, pages: PageFlowPage[], tests: PageFlowPageTest[]): PageFlowPageCheck[] {
  const incoming = pages.filter(source => source.id !== page.id)
    .flatMap(source => source.links.filter(link => targetPageId(link.to, pages) === page.id))
  const internalLinks = page.links.flatMap(link => internalTarget(link.to) ? [link] : [])
  const invalidLinks = internalLinks.filter(link => !targetPageId(link.to, pages))
  const selfLinks = internalLinks.filter(link => targetPageId(link.to, pages) === page.id)
  const isHome = pages[0]?.id === page.id || page.path === '/'

  return [
    {
      id: 'entry',
      title: '页面入口',
      description: isHome ? '首页不需要其它页面入口。' : incoming.length ? `${incoming.length} 个页面入口指向这里。` : '没有其它页面链接到此页面。',
      status: isHome || incoming.length ? 'passed' : 'uncovered',
    },
    {
      id: 'links',
      title: '页面链接',
      description: invalidLinks.length ? `${invalidLinks.length} 个链接没有匹配到页面：${invalidLinks.map(link => link.label || link.to).join('、')}` : `${internalLinks.length} 个内部链接均有效。`,
      status: invalidLinks.length ? 'failed' : 'passed',
    },
    {
      id: 'self-links',
      title: '自链接',
      description: selfLinks.length ? `${selfLinks.length} 个链接重新指向当前页面。` : '没有异常自链接。',
      status: selfLinks.length ? 'failed' : 'passed',
    },
    {
      id: 'tests',
      title: '测试覆盖',
      description: tests.length ? `已关联 ${tests.length} 个测试用例。` : '没有关联到测试用例。',
      status: tests.length ? 'passed' : 'uncovered',
    },
  ]
}
