import type { PageFlowHost, PageFlowHostCapture, PageFlowHostState } from '@pageflow/core/host'
import type { ExtensionMessage } from './shared'
import { loadVitePageFlowProject } from './vite-project'

export class ChromePageFlowHost implements PageFlowHost {
  readonly sourceId: string
  capturePage?: (url: string, viewport: { width: number; height: number }) => Promise<PageFlowHostCapture>

  constructor(readonly tabId: number) {
    this.sourceId = `chrome-tab:${tabId}`
  }

  private supplementalPages: PageFlowHostState['pages'] = []

  setSupplementalPages(pages: PageFlowHostState['pages']) {
    this.supplementalPages = pages
  }

  configUrl() {
    return browser.tabs.sendMessage(this.tabId, { type: 'pageflow:get-config-url' } satisfies ExtensionMessage) as Promise<string | undefined>
  }

  async refreshProjectConfig() {
    const state = await this.loadState()
    const project = await loadVitePageFlowProject(new URL(state.currentUrl).origin, await this.configUrl())
    this.setSupplementalPages(project.pages)
    return project
  }

  async loadState() {
    const state = await browser.tabs.sendMessage(this.tabId, { type: 'pageflow:get-state' } satisfies ExtensionMessage) as PageFlowHostState
    const pages = new Map(this.supplementalPages.map(page => [page.routeKey ?? page.url, page]))
    state.pages.forEach((page) => {
      const key = page.routeKey ?? page.url
      if (!this.supplementalPages.length || pages.has(key)) pages.set(key, page)
    })
    return { ...state, pages: [...pages.values()] }
  }

  async navigate(url: string) {
    await browser.tabs.update(this.tabId, { url, active: true })
  }

  async scan() {
    await browser.tabs.sendMessage(this.tabId, { type: 'pageflow:scan' } satisfies ExtensionMessage)
  }

  async highlight(selector: string) {
    await browser.tabs.sendMessage(this.tabId, { type: 'pageflow:highlight', selector } satisfies ExtensionMessage)
  }

  capture() {
    return browser.runtime.sendMessage({ type: 'pageflow:capture', tabId: this.tabId } satisfies ExtensionMessage) as Promise<PageFlowHostCapture>
  }

  async previewSize() {
    const metrics = await browser.tabs.sendMessage(this.tabId, { type: 'pageflow:get-metrics' } satisfies ExtensionMessage) as { previewWidth: number; previewHeight: number }
    return { width: metrics.previewWidth, height: metrics.previewHeight }
  }

  enableBackgroundCapture() {
    this.capturePage = async (url: string, viewport: { width: number; height: number }) => {
      const response = await browser.runtime.sendMessage({ type: 'pageflow:capture-page', tabId: this.tabId, url, viewport } satisfies ExtensionMessage) as { ok: boolean; value?: PageFlowHostCapture; error?: string }
      if (!response?.ok || !response.value) throw new Error(response?.error ?? 'PageFlow background capture failed')
      return response.value
    }
  }

  async loadStorage<T>(key: string) {
    return (await browser.storage.local.get(key))[key] as T | undefined
  }

  async saveStorage(key: string, value: unknown) {
    await browser.storage.local.set({ [key]: value })
  }

  async removeStorage(key: string) {
    await browser.storage.local.remove(key)
  }

  subscribe(listener: Parameters<PageFlowHost['subscribe']>[0]) {
    const receive = (message: ExtensionMessage, sender: { tab?: { id?: number } }) => {
      if (message.type === 'pageflow:runtime' && sender.tab?.id === this.tabId) listener(message.event)
    }
    browser.runtime.onMessage.addListener(receive)
    return () => browser.runtime.onMessage.removeListener(receive)
  }
}
