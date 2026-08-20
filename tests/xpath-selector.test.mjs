import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('builds stable XPath values and selects a node without triggering its click', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createXPathSelectionController, elementXPath } = await server.ssrLoadModule('/src/runtime/xpath-selector.ts')
    const window = new Window({ url: 'http://localhost/page' })
    const messages = []
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage: message => messages.push(message) } })
    window.document.body.innerHTML = '<main><button id="save">Save</button><ul><li>One</li><li>Two</li></ul></main>'
    const button = window.document.querySelector('button')
    const secondItem = window.document.querySelectorAll('li')[1]
    assert.equal(elementXPath(button), '//*[@id="save"]')
    assert.equal(elementXPath(secondItem), '/html/body/main/ul/li[2]')

    const interactions = []
    let clicks = 0
    button.addEventListener('click', () => clicks++)
    for (const eventName of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'])
      button.addEventListener(eventName, () => interactions.push(eventName))
    const controller = createXPathSelectionController(window)
    controller.setEnabled(true)
    button.dispatchEvent(new window.MouseEvent('pointerover', { bubbles: true }))
    assert.equal(button.hasAttribute('data-unplugin-pageflow-xpath-target'), true)
    for (const eventName of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'])
      button.dispatchEvent(new window.Event(eventName, { bubbles: true, cancelable: true }))
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
    assert.deepEqual(interactions, [])
    assert.equal(clicks, 0)
    assert.deepEqual(messages, [{ type: 'unplugin-pageflow:xpath-selected', xpath: '//*[@id="save"]' }])
    controller.setEnabled(false)
    assert.equal(button.hasAttribute('data-unplugin-pageflow-xpath-target'), false)
  } finally {
    await server.close()
  }
})
