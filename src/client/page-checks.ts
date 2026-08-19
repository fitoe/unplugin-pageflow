import type { PageFlowLink, PageFlowPage, PageFlowPageTest } from '../shared/types'

export type PageFlowPageCheckStatus = 'passed' | 'failed' | 'uncovered'

export interface PageFlowPageCheck {
  id: 'entry' | 'links' | 'self-links' | 'tests'
  title: string
  description: string
  status: PageFlowPageCheckStatus
}

export function mergePageLinks(...sources: Array<PageFlowLink[] | undefined>) {
  return [...new Map(sources.flatMap(source => source ?? []).map(link => [
    `${link.to}\u0000${link.label}\u0000${link.kind ?? 'link'}`,
    link,
  ])).values()]
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

function routeFamily(path: string) {
  const parts = path.split('/').filter(Boolean)
  return parts[0] === 'pages' ? parts[1] : parts[0]
}

export function isOrphanPage(page: PageFlowPage, pages: PageFlowPage[]) {
  const isHome = pages[0]?.id === page.id || page.path === '/'
  if (isHome) return false
  const hasIncoming = pages.some(source => source.id !== page.id
    && source.links.some(link => targetPageId(link.to, pages) === page.id))
  const hasOutgoing = page.links.some(link => {
    const target = targetPageId(link.to, pages)
    return target && target !== page.id
  })
  const family = routeFamily(page.path)
  const hasRouteFamily = Boolean(family) && pages.some(other => other.id !== page.id && routeFamily(other.path) === family)
  return !hasIncoming && !hasOutgoing && !hasRouteFamily
}

export function createPageChecks(
  page: PageFlowPage,
  pages: PageFlowPage[],
  tests: PageFlowPageTest[],
  effectiveLinks: PageFlowLink[] = page.links,
): PageFlowPageCheck[] {
  const incoming = pages.filter(source => source.id !== page.id)
    .flatMap(source => source.links.filter(link => targetPageId(link.to, pages) === page.id))
  const internalLinks = effectiveLinks.flatMap(link => internalTarget(link.to) ? [link] : [])
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
