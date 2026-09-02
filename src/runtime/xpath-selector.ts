import { PAGEFLOW_XPATH_SELECTED_MESSAGE } from '../shared/protocol'

const XPATH_HIGHLIGHT_ATTRIBUTE = 'data-unplugin-pageflow-xpath-target'
export const XPATH_MODE_ATTRIBUTE = 'data-unplugin-pageflow-xpath-mode'
const BLOCKED_INTERACTION_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'] as const
const PAGEFLOW_OVERLAY_SELECTOR = '[data-unplugin-pageflow-hotspot-layer], [data-unplugin-pageflow-diagnostic-highlight], [data-unplugin-pageflow-launcher]'

function xpathLiteral(value: string) {
  if (!value.includes('"')) return `"${value}"`
  if (!value.includes("'")) return `'${value}'`
  return `concat(${value.split('"').map((part, index) => `${index ? "'\"', " : ''}"${part}"`).join(', ')})`
}

export function elementXPath(element: Element) {
  if (element.id) return `//*[@id=${xpathLiteral(element.id)}]`
  const parts: string[] = []
  let current: Element | null = element
  while (current) {
    const name = current.localName.toLowerCase()
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter(sibling => sibling.localName === current!.localName)
      : []
    parts.unshift(siblings.length > 1 ? `${name}[${siblings.indexOf(current) + 1}]` : name)
    current = current.parentElement
  }
  return `/${parts.join('/')}`
}

export function createXPathSelectionController(windowRef: Window) {
  const documentRef = windowRef.document
  let enabled = false
  let highlighted: Element | undefined
  const clearHighlight = () => {
    highlighted?.removeAttribute(XPATH_HIGHLIGHT_ATTRIBUTE)
    highlighted = undefined
  }
  const eventElement = (event: Event) => {
    const target = event.target
    const targetElement = target && (target as Node).nodeType === 1 ? target as Element : undefined
    const fallback = targetElement && !targetElement.closest(PAGEFLOW_OVERLAY_SELECTOR) ? targetElement : undefined
    if (!('clientX' in event) || !('clientY' in event)
      || typeof event.clientX !== 'number' || typeof event.clientY !== 'number'
      || typeof documentRef.elementsFromPoint !== 'function') return fallback
    const candidates = documentRef.elementsFromPoint(event.clientX, event.clientY)
      .filter((element) => {
        if (element.closest(PAGEFLOW_OVERLAY_SELECTOR)) return false
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
    if (!candidates.length) return fallback
    return candidates.reduce((deepest, element) => deepest.contains(element) ? element : deepest)
  }
  const onPointerMove = (event: Event) => {
    const target = eventElement(event)
    if (!target || target === highlighted) return
    clearHighlight()
    target.setAttribute(XPATH_HIGHLIGHT_ATTRIBUTE, '')
    highlighted = target
  }
  const blockInteraction = (event: Event) => {
    if (!enabled) return
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  const applyEnabled = (next: boolean) => {
    if (enabled === next) return
    enabled = next
    documentRef.documentElement.toggleAttribute(XPATH_MODE_ATTRIBUTE, next)
    const action = next ? 'addEventListener' : 'removeEventListener'
    documentRef[action]('pointermove', onPointerMove, true)
    documentRef[action]('click', onClick, true)
    for (const eventName of BLOCKED_INTERACTION_EVENTS)
      documentRef[action](eventName, blockInteraction, true)
    if (!next) clearHighlight()
  }
  const onClick = (event: Event) => {
    if (!enabled) return
    const target = highlighted ?? eventElement(event)
    blockInteraction(event)
    if (!target || windowRef.parent === windowRef) return
    applyEnabled(false)
    windowRef.parent.postMessage({ type: PAGEFLOW_XPATH_SELECTED_MESSAGE, xpath: elementXPath(target) }, windowRef.location.origin)
  }
  const style = documentRef.createElement('style')
  style.textContent = `
    [${XPATH_HIGHLIGHT_ATTRIBUTE}] { outline: 2px solid #2563eb !important; outline-offset: -2px !important; background-color: rgb(37 99 235 / 12%) !important; cursor: crosshair !important; }
    html[${XPATH_MODE_ATTRIBUTE}] [data-unplugin-pageflow-hotspot-layer] { pointer-events: none !important; }
  `
  documentRef.head.append(style)

  return {
    setEnabled(next: boolean) {
      applyEnabled(next)
    },
  }
}
