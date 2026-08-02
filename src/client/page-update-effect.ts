import type { PageFlowPage } from '../shared/types'
import { createRouteDeckView } from './layout'

export function pageUpdateEffectTarget(pages: PageFlowPage[], groupPath: string[], pageId: string) {
  const view = createRouteDeckView(pages, groupPath)
  const page = view.directPages.find(item => item.id === pageId)
  if (page) return { page, grouped: false }
  const deck = view.decks.find(item => item.pages.some(page => page.id === pageId))
  return deck ? { page: deck.representative, grouped: true } : undefined
}
