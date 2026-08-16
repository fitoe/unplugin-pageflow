import { deletePageFlowInternalParams, hasPageFlowPreview, pageFlowPreviewRole } from '../shared/protocol.ts'
import { isPageFlowSensitiveControl, pageFlowFormControlIdentity } from './form-fill.ts'

const STATE_PREFIX = 'unplugin-pageflow:page-state:'

export interface PageFlowStateAdapter<T> {
  get(): T
  restore(state: T): void
}

function previewContext() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!hasPageFlowPreview(url.searchParams)) return
  const role = pageFlowPreviewRole(url.searchParams)
  deletePageFlowInternalParams(url.searchParams)
  return { role, location: `${url.pathname}${url.search}${url.hash}` }
}

function storageKey(scope: string) {
  const context = previewContext()
  return context
    ? `${STATE_PREFIX}${encodeURIComponent(context.role)}:${encodeURIComponent(context.location)}:${scope}`
    : undefined
}

function readState<T>(key: string): T | undefined {
  try {
    const value = window.localStorage.getItem(key)
    return value == null ? undefined : JSON.parse(value) as T
  } catch {
    return undefined
  }
}

function writeState(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

/** Persist an explicit unit of page state while the page is rendered by PageFlow. */
export function definePageFlowState<T>(key: string, adapter: PageFlowStateAdapter<T>) {
  const cacheKey = storageKey(`variable:${key}`)
  if (!cacheKey) return () => {}

  let disposed = false
  let serialized = ''
  const save = () => {
    if (disposed) return
    try {
      const value = adapter.get()
      const next = JSON.stringify(value)
      if (next === serialized) return
      serialized = next
      writeState(cacheKey, value)
    } catch {}
  }
  const restore = () => {
    const value = readState<T>(cacheKey)
    if (value === undefined || disposed) return
    try {
      adapter.restore(value)
      serialized = JSON.stringify(adapter.get())
    } catch {}
  }
  requestAnimationFrame(() => requestAnimationFrame(restore))
  const timer = window.setInterval(save, 400)
  window.addEventListener('pagehide', save)
  window.addEventListener('beforeunload', save)
  return () => {
    save()
    disposed = true
    window.clearInterval(timer)
    window.removeEventListener('pagehide', save)
    window.removeEventListener('beforeunload', save)
  }
}

interface DomControlState {
  value?: string
  checked?: boolean
}

interface DomPageState {
  controls: Record<string, DomControlState>
  scrollX: number
  scrollY: number
}

function controls() {
  return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')]
    .filter(element => !isPageFlowSensitiveControl(element))
}

/** Persist native form controls and the window scroll position as a safe fallback. */
export function startPageFlowDomStatePersistence() {
  const cacheKey = storageKey('dom')
  if (!cacheKey) return () => {}
  let timer: number | undefined
  let disposed = false
  const save = () => {
    if (disposed) return
    const state: DomPageState = { controls: {}, scrollX: window.scrollX, scrollY: window.scrollY }
    controls().forEach(element => {
      const item: DomControlState = { value: element.value }
      if (element.localName === 'input' && ['checkbox', 'radio'].includes((element as HTMLInputElement).type)) item.checked = (element as HTMLInputElement).checked
      state.controls[pageFlowFormControlIdentity(element)] = item
    })
    writeState(cacheKey, state)
  }
  const scheduleSave = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(save, 150)
  }
  const restore = () => {
    const state = readState<DomPageState>(cacheKey)
    if (!state || disposed) return
    controls().forEach(element => {
      const item = state.controls[pageFlowFormControlIdentity(element)]
      if (!item) return
      if (item.value !== undefined) element.value = item.value
      if (element.localName === 'input' && item.checked !== undefined) (element as HTMLInputElement).checked = item.checked
      const EventConstructor = element.ownerDocument.defaultView?.Event ?? Event
      element.dispatchEvent(new EventConstructor('input', { bubbles: true }))
      element.dispatchEvent(new EventConstructor('change', { bubbles: true }))
    })
    window.scrollTo(state.scrollX, state.scrollY)
  }
  document.addEventListener('input', scheduleSave, true)
  document.addEventListener('change', scheduleSave, true)
  window.addEventListener('scroll', scheduleSave, true)
  window.addEventListener('pagehide', save)
  window.addEventListener('beforeunload', save)
  requestAnimationFrame(() => requestAnimationFrame(restore))
  return () => {
    save()
    disposed = true
    window.clearTimeout(timer)
    document.removeEventListener('input', scheduleSave, true)
    document.removeEventListener('change', scheduleSave, true)
    window.removeEventListener('scroll', scheduleSave, true)
    window.removeEventListener('pagehide', save)
    window.removeEventListener('beforeunload', save)
  }
}
