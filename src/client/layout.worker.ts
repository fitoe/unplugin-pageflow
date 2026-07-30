import { layoutPagesByRoute } from './layout'
import type { PageFlowPage } from '../shared/types'

interface LayoutRequest {
  id: number
  pages: PageFlowPage[]
  cardHeights: Array<[string, number]>
}

self.addEventListener('message', (event: MessageEvent<LayoutRequest>) => {
  const { id, pages, cardHeights } = event.data
  self.postMessage({
    id,
    positions: [...layoutPagesByRoute(pages, new Map(cardHeights))],
  })
})
