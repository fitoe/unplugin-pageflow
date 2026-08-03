import type { ExtensionMessage } from '../utils/shared'

export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id == null || !/^https?:/.test(tab.url ?? '')) return
    const dashboardUrl = browser.runtime.getURL(`/panel.html?tabId=${tab.id}`)
    const existing = (await browser.tabs.query({ url: `${browser.runtime.getURL('/panel.html')}*` }))
      .find(candidate => candidate.url === dashboardUrl)
    if (existing?.id != null) {
      await browser.tabs.update(existing.id, { active: true })
      if (existing.windowId != null) await browser.windows.update(existing.windowId, { focused: true })
      return
    }
    await browser.tabs.create({ url: dashboardUrl, active: true, openerTabId: tab.id })
  })

  browser.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    if (message.type !== 'pageflow:capture') return
    void captureSourceTab(message.tabId, sender.tab?.id).then(sendResponse)
    return true
  })
})

async function captureSourceTab(sourceTabId: number, dashboardTabId?: number) {
  const source = await browser.tabs.get(sourceTabId)
  if (source.id == null) throw new Error('PageFlow source tab is unavailable')
  try {
    await browser.tabs.update(source.id, { active: true })
    await new Promise(resolve => setTimeout(resolve, 100))
    return await browser.tabs.captureVisibleTab(source.windowId, { format: 'png' })
  } finally {
    if (dashboardTabId != null) await browser.tabs.update(dashboardTabId, { active: true }).catch(() => undefined)
  }
}
