import { PAGEFLOW_NETWORK_EVENT, PAGEFLOW_READY_EVENT } from '../shared/protocol'
import {
  boundedPageFlowDocumentHeight,
  isPageFlowInfiniteListDocument,
  pageFlowContentHeight,
  pageFlowDocumentHeight,
} from '@pageflow/runtime'

interface PageFlowWindow extends Window {
  __UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__?: () => number
}

export function previewDocumentHeight(document: Document, minimumHeight: number) {
  return pageFlowDocumentHeight(document, minimumHeight)
}

export function boundedPreviewDocumentHeight(document: Document, viewportHeight: number, maximumViewports = 4) {
  return boundedPageFlowDocumentHeight(document, viewportHeight, maximumViewports)
}

export function previewContentHeight(document: Document, minimumHeight: number) {
  return pageFlowContentHeight(document, minimumHeight)
}

export function isInfiniteListDocument(document: Document) {
  return isPageFlowInfiniteListDocument(document)
}

export function maskedIconBackground(maskImage: string, color: string) {
  const match = maskImage.match(/^url\((['"]?)(data:image\/svg\+xml[^)]*)\1\)$/)
  if (!match) return
  const dataUrl = match[2]
  const separator = dataUrl.indexOf(',')
  if (separator < 0) return
  try {
    const svg = decodeURIComponent(dataUrl.slice(separator + 1)).replaceAll('currentColor', color)
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
  } catch {
    return
  }
}

export function materializeMaskedIcons(root: Document | Element) {
  const document = root.nodeType === 9 || 'defaultView' in root ? root as Document : root.ownerDocument
  if (!document) return
  const computedStyle = (element: HTMLElement) => !element.isConnected && element.style.cssText
    ? element.style
    : document.defaultView?.getComputedStyle(element)
  root.querySelector('[data-unplugin-pageflow-hotspot-layer]')?.remove()
  root.querySelector('[data-unplugin-pageflow-launcher]')?.remove()
  root.querySelectorAll<HTMLElement>('.status-space').forEach(element => element.remove())
  root.querySelectorAll<HTMLElement>('uni-text > span').forEach(element => {
    const style = computedStyle(element)
    if (!style || style.whiteSpace !== 'pre-line' || !element.textContent || /[\r\n]/.test(element.textContent)) return
    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.5
    if (element.getBoundingClientRect().height <= lineHeight + 1) element.style.whiteSpace = 'nowrap'
  })
  root.querySelectorAll<HTMLElement>('[class*="i-"], [style*="mask"]').forEach(element => {
    const style = computedStyle(element)
    if (!style) return
    const backgroundImage = maskedIconBackground(style.maskImage || style.webkitMaskImage, style.color)
    if (!backgroundImage) return
    Object.assign(element.style, {
      backgroundColor: 'transparent',
      backgroundImage,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: style.maskSize === 'auto' ? '100% 100%' : style.maskSize,
      maskImage: 'none',
      webkitMaskImage: 'none',
    })
  })
}

function waitForDomQuiet(frame: HTMLIFrameElement, quietMs: number, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const body = frame.contentDocument?.body
    const targetWindow = frame.contentWindow
    if (!body || !targetWindow) return reject(new Error('Preview document is unavailable'))

    let quietTimer: ReturnType<typeof setTimeout>
    const timeoutTimer = setTimeout(() => finish(new Error('Preview readiness timed out')), timeoutMs)
    const observer = new MutationObserver(() => scheduleQuiet())
    const finish = (error?: Error) => {
      clearTimeout(quietTimer)
      clearTimeout(timeoutTimer)
      observer.disconnect()
      targetWindow.removeEventListener(PAGEFLOW_READY_EVENT, handleReady)
      targetWindow.removeEventListener(PAGEFLOW_NETWORK_EVENT, scheduleQuiet)
      error ? reject(error) : resolve()
    }
    const scheduleQuiet = () => {
      clearTimeout(quietTimer)
      if ((targetWindow as PageFlowWindow).__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__?.()) return
      quietTimer = setTimeout(() => finish(), quietMs)
    }
    // A manual ready signal means the application finished its own work. Keep
    // the quiet window: Vue/React can still flush DOM, fonts and images after it.
    const handleReady = () => scheduleQuiet()

    observer.observe(body, { attributes: true, childList: true, subtree: true })
    targetWindow.addEventListener(PAGEFLOW_READY_EVENT, handleReady, { once: true })
    targetWindow.addEventListener(PAGEFLOW_NETWORK_EVENT, scheduleQuiet)
    scheduleQuiet()
  })
}

function activeFiniteAnimations(document: Document) {
  if (typeof document.getAnimations !== 'function') return []
  return document.getAnimations().filter(animation => {
    if (animation.playState !== 'running' && !animation.pending) return false
    const timing = animation.effect?.getComputedTiming()
    return Number.isFinite(timing?.endTime)
  })
}

function visualSignature(document: Document) {
  const body = document.body
  const elements = body ? Array.from(body.getElementsByTagName('*')) : []
  const sampleStride = Math.max(1, Math.ceil(elements.length / 64))
  const geometry = elements.filter((_element, index) => index % sampleStride === 0 || index === elements.length - 1).map(element => {
    const rect = element.getBoundingClientRect()
    return `${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)},${Math.round(rect.height)}`
  }).join(';')
  const images = Array.from(document.querySelectorAll('img')).map(image =>
    `${image.currentSrc || image.src}:${image.complete ? image.naturalWidth : 0}x${image.complete ? image.naturalHeight : 0}`,
  ).join(';')
  return [
    previewDocumentHeight(document, 0),
    body?.innerText.length ?? 0,
    elements.length,
    images,
    geometry,
  ].join('|')
}

async function waitForDocumentStable(document: Document, stableSamples = 4, intervalMs = 250, maximumWaitMs = 30000) {
  const startedAt = performance.now()
  let previous = ''
  let stable = 0
  while (stable < stableSamples && performance.now() - startedAt < maximumWaitMs) {
    const signature = visualSignature(document)
    stable = signature === previous && activeFiniteAnimations(document).length === 0 ? stable + 1 : 0
    previous = signature
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  if (stable < stableSamples) throw new Error('Preview visual state did not settle')
}

export async function waitForPreviewReady(frame: HTMLIFrameElement, quietMs = 3000, timeoutMs = 30000) {
  const document = frame.contentDocument
  if (!document?.body) throw new Error('Preview document is unavailable')

  const waitForImages = () => Promise.all(Array.from(document.querySelectorAll('img')).map(image =>
    image.complete && image.naturalWidth ? undefined : image.decode().catch(() => undefined),
  ))
  const hasCanvas = Boolean(document.querySelector('canvas'))
  const mediaReady = Promise.all([document.fonts?.ready, waitForImages()])
  if (hasCanvas)
    await Promise.race([mediaReady, new Promise(resolve => setTimeout(resolve, Math.min(timeoutMs, 5000)))])
  else
    await mediaReady
  if (hasCanvas) {
    const startedAt = performance.now()
    while ((frame.contentWindow as PageFlowWindow | null)?.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__?.()
      && performance.now() - startedAt < Math.min(timeoutMs, 5000))
      await new Promise(resolve => setTimeout(resolve, 250))
    await new Promise(resolve => setTimeout(resolve, quietMs))
  } else {
    await waitForDomQuiet(frame, quietMs, timeoutMs)
    await waitForImages()
    await waitForDocumentStable(document, 4, 250, timeoutMs)
  }
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

  const body = document.body
  if (!body.children.length && !body.textContent?.trim()) throw new Error('Preview page is empty')
}
