export interface PageFlowRequest {
  method: string
  url: string
  startedAt: number
}

export interface NetworkInstrumentationOptions {
  onPendingChange?(pending: number): void
  onFetchResponse?(request: PageFlowRequest, response: Response): void
  onFetchError?(request: PageFlowRequest, error: unknown): void
  onXhrComplete?(request: PageFlowRequest, xhr: XMLHttpRequest): void
}

type PageFlowBrowserWindow = Window & { XMLHttpRequest: typeof XMLHttpRequest }

export function instrumentPageFlowNetwork(win: PageFlowBrowserWindow, options: NetworkInstrumentationOptions = {}) {
  let pending = 0
  const update = (change: number) => {
    pending = Math.max(0, pending + change)
    options.onPendingChange?.(pending)
  }

  const originalFetch = win.fetch.bind(win)
  win.fetch = (...args) => {
    const input = args[0]
    const request: PageFlowRequest = {
      method: (args[1]?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
      url: input instanceof Request ? input.url : String(input),
      startedAt: win.performance.now(),
    }
    update(1)
    return originalFetch(...args).then((response) => {
      options.onFetchResponse?.(request, response)
      return response
    }, (error) => {
      options.onFetchError?.(request, error)
      throw error
    }).finally(() => update(-1))
  }

  const requests = new WeakMap<XMLHttpRequest, PageFlowRequest>()
  const originalOpen = win.XMLHttpRequest.prototype.open
  win.XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: unknown[]) {
    requests.set(this, { method: method.toUpperCase(), url: String(url), startedAt: 0 })
    return originalOpen.apply(this, [method, url, ...args] as Parameters<XMLHttpRequest['open']>)
  }
  const originalSend = win.XMLHttpRequest.prototype.send
  win.XMLHttpRequest.prototype.send = function (...args: Parameters<XMLHttpRequest['send']>) {
    const request = requests.get(this)
    if (request) request.startedAt = win.performance.now()
    update(1)
    this.addEventListener('loadend', () => {
      update(-1)
      const current = requests.get(this)
      if (current) options.onXhrComplete?.(current, this)
    }, { once: true })
    return originalSend.apply(this, args)
  }

  return { pending: () => pending }
}

export function instrumentPageFlowHistory(win: Window, callback: (url: string | URL, method: 'pushState' | 'replaceState') => void) {
  ;(['pushState', 'replaceState'] as const).forEach((method) => {
    const original = win.history[method].bind(win.history)
    win.history[method] = ((data: unknown, unused: string, url?: string | URL | null) => {
      if (url != null) callback(url, method)
      return original(data, unused, url)
    }) as History[typeof method]
  })
}

export function pageFlowElementSelector(element: Element) {
  const css = element.ownerDocument.defaultView?.CSS
  const escape = (value: string) => css?.escape?.(value) ?? value.replace(/[^a-zA-Z0-9_-]/g, character => `\\${character}`)
  if (element.id) return `#${escape(element.id)}`
  const testId = element.getAttribute('data-testid')
  if (testId) return `[data-testid="${escape(testId)}"]`
  const parts: string[] = []
  let current: Element | null = element
  while (current && current !== element.ownerDocument.documentElement && parts.length < 5) {
    let part = current.tagName.toLowerCase()
    const parent: Element | null = current.parentElement
    if (parent) {
      const siblings = [...parent.children].filter(child => child.tagName === current!.tagName)
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`
    }
    parts.unshift(part)
    current = parent
  }
  return parts.join(' > ')
}

export function pageFlowAccessibleName(element: Element) {
  const labelledBy = element.getAttribute('aria-labelledby')
    ?.split(/\s+/)
    .map(id => element.ownerDocument.getElementById(id)?.textContent?.trim())
    .filter(Boolean)
    .join(' ')
  const labels = 'labels' in element
    ? [...((element as HTMLInputElement).labels ?? [])].map(label => label.textContent?.trim()).filter(Boolean).join(' ')
    : ''
  return element.getAttribute('aria-label')?.trim()
    || labelledBy
    || labels
    || element.getAttribute('title')?.trim()
    || element.textContent?.trim()
    || (element instanceof HTMLInputElement && element.type === 'button' ? element.value.trim() : '')
}

type HighlightWindow = Window & { __PAGEFLOW_DIAGNOSTIC_HIGHLIGHT__?: HTMLElement }

export function highlightPageFlowElement(win: Window, selector: string) {
  const trackedWindow = win as HighlightWindow
  trackedWindow.__PAGEFLOW_DIAGNOSTIC_HIGHLIGHT__?.remove()
  trackedWindow.__PAGEFLOW_DIAGNOSTIC_HIGHLIGHT__ = undefined
  let element: Element | null = null
  try {
    element = win.document.querySelector(selector)
  } catch {
    return false
  }
  if (!element) return false
  element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' })
  const rect = element.getBoundingClientRect()
  const overlay = win.document.createElement('div')
  const ripple = win.document.createElement('div')
  overlay.setAttribute('data-unplugin-pageflow-diagnostic-highlight', '')
  Object.assign(overlay.style, {
    position: 'fixed', zIndex: '2147483647', pointerEvents: 'none',
    left: `${rect.left - 3}px`, top: `${rect.top - 3}px`, width: `${rect.width + 6}px`, height: `${rect.height + 6}px`,
    border: '2px solid #ef4444', borderRadius: '8px', boxSizing: 'border-box', boxShadow: '0 0 0 3px rgb(239 68 68 / 20%)',
  })
  Object.assign(ripple.style, {
    position: 'absolute', inset: '-2px', border: '2px solid #ef4444', borderRadius: 'inherit', boxSizing: 'border-box',
  })
  overlay.append(ripple)
  win.document.body.append(overlay)
  ripple.animate([
    { opacity: 0.8, transform: 'scale(1)' },
    { opacity: 0, transform: 'scale(1.35)' },
  ], { duration: 900, easing: 'ease-out', iterations: 3 })
  trackedWindow.__PAGEFLOW_DIAGNOSTIC_HIGHLIGHT__ = overlay
  win.setTimeout(() => {
    if (trackedWindow.__PAGEFLOW_DIAGNOSTIC_HIGHLIGHT__ !== overlay) return
    overlay.remove()
    trackedWindow.__PAGEFLOW_DIAGNOSTIC_HIGHLIGHT__ = undefined
  }, 3_000)
  return true
}
