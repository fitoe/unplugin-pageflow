import type { IncomingHttpHeaders } from 'node:http'

/** Protect browser mutations while preserving requests from local CLI clients. */
export function isAllowedPageFlowRequest(headers: IncomingHttpHeaders, method = 'GET', https = false) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true
  const site = headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin' && site !== 'none') return false

  const origin = headers.origin
  if (origin === undefined) {
    // Older browsers may provide only Referer; CLI clients normally send neither.
    if (!headers.referer) return true
  }
  try {
    if (!headers.host) return false
    const expected = new URL(`${https ? 'https' : 'http'}://${headers.host}`).origin
    const actual = new URL(origin ?? headers.referer!).origin
    return actual !== 'null' && actual === expected
  } catch {
    return false
  }
}
