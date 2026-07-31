import { render } from '@builder.io/qwik'
import type { RenderOptions } from '@builder.io/qwik'
import Root from './root'

export default function (options: RenderOptions) {
  return render(document, <Root />, options)
}
