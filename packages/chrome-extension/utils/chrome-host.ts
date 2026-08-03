import type { PageFlowHost, PageFlowHostState } from '@pageflow/core/host'
import type { ExtensionMessage } from './shared'

export class ChromePageFlowHost implements PageFlowHost {
  readonly sourceId: string

  constructor(readonly tabId: number) {
    this.sourceId = `chrome-tab:${tabId}`
  }

  async loadState() {
    return browser.tabs.sendMessage(this.tabId, { type: 'pageflow:get-state' } satisfies ExtensionMessage) as Promise<PageFlowHostState>
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
    return browser.runtime.sendMessage({ type: 'pageflow:capture', tabId: this.tabId } satisfies ExtensionMessage) as Promise<string>
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
