import { PAGEFLOW_XPATH_SELECTED_MESSAGE } from '../shared/protocol'

const XPATH_HIGHLIGHT_ATTRIBUTE = 'data-unplugin-pageflow-xpath-target'
const BLOCKED_INTERACTION_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'] as const

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
    return target && (target as Node).nodeType === 1 ? target as Element : undefined
  }
  const onPointerOver = (event: Event) => {
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
  const onClick = (event: Event) => {
    if (!enabled) return
    const target = eventElement(event)
    blockInteraction(event)
    if (!target || windowRef.parent === windowRef) return
    windowRef.parent.postMessage({ type: PAGEFLOW_XPATH_SELECTED_MESSAGE, xpath: elementXPath(target) }, windowRef.location.origin)
  }
  const style = documentRef.createElement('style')
  style.textContent = `[${XPATH_HIGHLIGHT_ATTRIBUTE}] { outline: 2px solid #2563eb !important; outline-offset: -2px !important; background-color: rgb(37 99 235 / 12%) !important; cursor: crosshair !important; }`
  documentRef.head.append(style)

  return {
    setEnabled(next: boolean) {
      if (enabled === next) return
      enabled = next
      const action = next ? 'addEventListener' : 'removeEventListener'
      documentRef[action]('pointerover', onPointerOver, true)
      documentRef[action]('click', onClick, true)
      for (const eventName of BLOCKED_INTERACTION_EVENTS)
        documentRef[action](eventName, blockInteraction, true)
      if (!next) clearHighlight()
    },
  }
}
