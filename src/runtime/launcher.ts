import type { ResolvedPageFlowOptions } from '../shared/types'
import { hasPageFlowPreview } from '../shared/protocol.ts'

export const PAGEFLOW_LAUNCHER_SELECTOR = '[data-unplugin-pageflow-launcher]'

export function mountPageFlowLauncher(config: Pick<ResolvedPageFlowOptions, 'launcher' | 'previewPath'>) {
  if (!config.launcher || window.parent !== window) return
  if (hasPageFlowPreview(new URLSearchParams(window.location.search))) return
  if (window.location.pathname.startsWith(config.previewPath)) return
  if (document.querySelector(PAGEFLOW_LAUNCHER_SELECTOR)) return

  const host = document.createElement('div')
  host.setAttribute('data-unplugin-pageflow-launcher', '')
  host.dataset.edge = 'right'
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      :host { position: fixed; right: 0; bottom: 16px; z-index: 2147483646; transition: left 160ms ease, right 160ms ease, top 160ms ease, bottom 160ms ease; }
      :host([data-dragging]) { transition: none; }
      button { display: grid; width: 38px; height: 38px; padding: 0; place-items: center; border: 1px solid rgb(255 255 255 / 18%); background: #18181b; color: #fff; box-shadow: 0 6px 18px rgb(0 0 0 / 26%); cursor: grab; touch-action: none; user-select: none; transition: width 120ms ease, height 120ms ease, box-shadow 120ms ease; }
      button:active { cursor: grabbing; }
      button:hover { box-shadow: 0 0 0 5px rgb(139 92 246 / 12%), 0 8px 22px rgb(0 0 0 / 32%); animation: pageflow-launcher-breathe 1.8s ease-in-out infinite; }
      :host([data-edge="right"]) button { border-right: 0; border-radius: 10px 0 0 10px; }
      :host([data-edge="left"]) button { border-left: 0; border-radius: 0 10px 10px 0; }
      :host([data-edge="top"]) button { border-top: 0; border-radius: 0 0 10px 10px; }
      :host([data-edge="bottom"]) button { border-bottom: 0; border-radius: 10px 10px 0 0; }
      button:focus-visible { outline: 3px solid #8b5cf6; outline-offset: 3px; }
      svg { width: 21px; height: 21px; }
      @keyframes pageflow-launcher-breathe {
        50% { box-shadow: 0 0 0 9px rgb(139 92 246 / 5%), 0 10px 26px rgb(0 0 0 / 36%); }
      }
      @media (prefers-reduced-motion: reduce) { :host, button { transition: none; } button:hover { animation: none; } }
    </style>
    <button type="button" aria-label="打开 PageFlow" title="打开 PageFlow">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path d="M6 5.5h5.2a3 3 0 0 1 3 3v7a3 3 0 0 0 3 3H18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="6" cy="5.5" r="2.5" fill="#a78bfa"/><circle cx="18" cy="18.5" r="2.5" fill="#34d399"/>
      </svg>
    </button>
  `
  const button = shadow.querySelector('button')!
  let dragStart: { pointerId: number, x: number, y: number, left: number, top: number } | undefined
  let dragged = false
  let suppressClick = false
  const finishDrag = (event: PointerEvent) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return
    dragStart = undefined
    host.removeAttribute('data-dragging')
    if (!dragged) return
    suppressClick = event.type === 'pointerup'
    const rect = host.getBoundingClientRect()
    const distances = {
      left: rect.left,
      right: window.innerWidth - rect.right,
      top: rect.top,
      bottom: window.innerHeight - rect.bottom,
    }
    const edge = Object.entries(distances).sort(([, a], [, b]) => a - b)[0][0] as 'left' | 'right' | 'top' | 'bottom'
    host.dataset.edge = edge
    if (edge === 'left' || edge === 'right') {
      host.style.left = edge === 'left' ? '0' : 'auto'
      host.style.right = edge === 'right' ? '0' : 'auto'
      host.style.top = `${Math.max(0, Math.min(rect.top, window.innerHeight - rect.height))}px`
      host.style.bottom = 'auto'
    } else {
      host.style.left = `${Math.max(0, Math.min(rect.left, window.innerWidth - rect.width))}px`
      host.style.right = 'auto'
      host.style.top = edge === 'top' ? '0' : 'auto'
      host.style.bottom = edge === 'bottom' ? '0' : 'auto'
    }
  }
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    const rect = host.getBoundingClientRect()
    dragStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }
    dragged = false
    host.setAttribute('data-dragging', '')
    button.setPointerCapture?.(event.pointerId)
  })
  button.addEventListener('pointermove', (event) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return
    const deltaX = event.clientX - dragStart.x
    const deltaY = event.clientY - dragStart.y
    if (!dragged && Math.hypot(deltaX, deltaY) < 4) return
    dragged = true
    const rect = host.getBoundingClientRect()
    host.style.left = `${Math.max(0, Math.min(dragStart.left + deltaX, window.innerWidth - rect.width))}px`
    host.style.top = `${Math.max(0, Math.min(dragStart.top + deltaY, window.innerHeight - rect.height))}px`
    host.style.right = 'auto'
    host.style.bottom = 'auto'
  })
  button.addEventListener('pointerup', finishDrag)
  button.addEventListener('pointercancel', finishDrag)
  button.addEventListener('click', () => {
    if (suppressClick) {
      suppressClick = false
      return
    }
    window.open(new URL(config.previewPath, window.location.origin).href, '_blank')
  })
  document.body.append(host)
}
