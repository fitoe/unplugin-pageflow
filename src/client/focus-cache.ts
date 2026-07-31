import type { PageFlowLink, PageFlowPage } from '../shared/types'

export interface FocusedPageState {
  links?: PageFlowLink[]
  positions: Record<string, [number, number]>
}

interface StoredFocusedPageState extends FocusedPageState {
  revision: string
}

function cloneLinks(links: PageFlowLink[]) {
  return links.map(link => ({
    ...link,
    hotspot: link.hotspot ? { ...link.hotspot } : undefined,
  }))
}

function clonePositions(positions: Record<string, [number, number]>) {
  return Object.fromEntries(Object.entries(positions).map(([id, position]) => [id, [...position] as [number, number]]))
}

export class FocusedPageStateCache {
  private readonly states = new Map<string, StoredFocusedPageState>()

  get(page: PageFlowPage): FocusedPageState | undefined {
    const state = this.states.get(page.id)
    if (!state || state.revision !== (page.revision ?? '')) return undefined
    return {
      links: state.links ? cloneLinks(state.links) : undefined,
      positions: clonePositions(state.positions),
    }
  }

  set(page: PageFlowPage, links: PageFlowLink[] | undefined, positions: Record<string, [number, number]>) {
    this.states.set(page.id, {
      revision: page.revision ?? '',
      links: links ? cloneLinks(links) : undefined,
      positions: clonePositions(positions),
    })
  }

  retain(pageIds: Set<string>) {
    this.states.forEach((_state, pageId) => {
      if (!pageIds.has(pageId)) this.states.delete(pageId)
    })
  }

  clear() {
    this.states.clear()
  }
}

export function preserveScannedFocusedLinks(
  pageId: string,
  scannedPageId: string | undefined,
  currentLinks: PageFlowLink[],
  incomingLinks: PageFlowLink[],
) {
  return scannedPageId === pageId ? currentLinks : incomingLinks
}
