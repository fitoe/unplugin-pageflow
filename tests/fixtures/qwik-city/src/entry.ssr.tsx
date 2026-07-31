import { renderToStream } from '@builder.io/qwik/server'
import type { RenderToStreamOptions } from '@builder.io/qwik/server'
import Root from './root'

export function render(options: RenderToStreamOptions) {
  return renderToStream(<Root />, {
    ...options,
    serverData: { ...options.serverData },
  })
}

export default render
