import type { PageFlowFramework } from '../shared/types'
import type { PageFlowPreviewMode } from './thumbnails'

export function initialPreviewMode(storedMode: string | null, framework: PageFlowFramework): PageFlowPreviewMode {
  if (storedMode === 'mobile' || storedMode === 'tablet' || storedMode === 'pc') return storedMode
  return framework === 'uni-app' ? 'mobile' : 'pc'
}
