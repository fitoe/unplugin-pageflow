import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('开发态浮动按钮打开 PageFlow 且可关闭', async () => {
  const browser = new Window({ url: 'http://localhost/app' })
  const previous = { window: globalThis.window, document: globalThis.document }
  Object.assign(globalThis, { window: browser, document: browser.document })
  const opened = []
  browser.open = (...args) => opened.push(args)
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { mountPageFlowLauncher } = await server.ssrLoadModule('/src/runtime/launcher.ts')
    const config = { launcher: true, previewPath: '/__unplugin-pageflow/' }
    mountPageFlowLauncher(config)
    mountPageFlowLauncher(config)

    const host = browser.document.querySelector('[data-unplugin-pageflow-launcher]')
    assert.ok(host)
    assert.equal(browser.document.querySelectorAll('[data-unplugin-pageflow-launcher]').length, 1)
    const button = host.shadowRoot.querySelector('button')
    assert.equal(button.getAttribute('aria-label'), '打开 PageFlow')
    assert.match(host.shadowRoot.querySelector('style').textContent, /pageflow-launcher-breathe/)
    button.click()
    assert.deepEqual(opened, [['http://localhost/__unplugin-pageflow/', '_blank']])

    Object.defineProperties(browser, {
      innerWidth: { configurable: true, value: 800 },
      innerHeight: { configurable: true, value: 600 },
    })
    host.getBoundingClientRect = () => {
      const left = host.style.left && host.style.left !== 'auto' ? Number.parseFloat(host.style.left) : 762
      const top = host.style.top && host.style.top !== 'auto' ? Number.parseFloat(host.style.top) : 546
      return { x: left, y: top, left, top, right: left + 38, bottom: top + 38, width: 38, height: 38, toJSON() {} }
    }
    button.dispatchEvent(new browser.PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 780, clientY: 565, pointerId: 1 }))
    button.dispatchEvent(new browser.PointerEvent('pointermove', { bubbles: true, clientX: 10, clientY: 300, pointerId: 1 }))
    button.dispatchEvent(new browser.PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 300, pointerId: 1 }))
    assert.equal(host.dataset.edge, 'left')
    assert.equal(host.style.left, '0px')
    button.click()
    assert.equal(opened.length, 1)

    host.remove()
    mountPageFlowLauncher({ ...config, launcher: false })
    assert.equal(browser.document.querySelector('[data-unplugin-pageflow-launcher]'), null)
  } finally {
    Object.assign(globalThis, previous)
    await server.close()
    await browser.happyDOM.close()
  }
})
