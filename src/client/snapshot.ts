import { PAGEFLOW_READY_EVENT } from '../shared/protocol'

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
      error ? reject(error) : resolve()
    }
    const scheduleQuiet = () => {
      clearTimeout(quietTimer)
      quietTimer = setTimeout(() => finish(), quietMs)
    }
    const handleReady = () => finish()

    observer.observe(body, { attributes: true, childList: true, subtree: true })
    targetWindow.addEventListener(PAGEFLOW_READY_EVENT, handleReady, { once: true })
    scheduleQuiet()
  })
}

export async function waitForPreviewReady(frame: HTMLIFrameElement, quietMs = 800, timeoutMs = 12000) {
  const document = frame.contentDocument
  if (!document?.body) throw new Error('Preview document is unavailable')

  const waitForImages = () => Promise.all([...document.images].map(image =>
    image.complete && image.naturalWidth ? undefined : image.decode().catch(() => undefined),
  ))
  await Promise.all([document.fonts?.ready, waitForImages()])
  await waitForDomQuiet(frame, quietMs, timeoutMs)
  await waitForImages()

  const body = document.body
  if (!body.children.length && !body.textContent?.trim()) throw new Error('Preview page is empty')
}
