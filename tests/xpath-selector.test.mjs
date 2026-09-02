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
    button.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true }))
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

test('selects the deepest visible element when a button retargets pointer events', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createXPathSelectionController } = await server.ssrLoadModule('/src/runtime/xpath-selector.ts')
    const window = new Window({ url: 'http://localhost/page' })
    const messages = []
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage: message => messages.push(message) } })
    window.document.body.innerHTML = '<button><span class="copy"><em>Details</em></span></button>'
    const button = window.document.querySelector('button')
    const copy = window.document.querySelector('.copy')
    const detail = window.document.querySelector('em')
    for (const element of [button, copy, detail])
      element.getBoundingClientRect = () => ({ width: 100, height: 20 })
    window.document.elementsFromPoint = () => [button, copy, detail]

    const controller = createXPathSelectionController(window)
    controller.setEnabled(true)
    button.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 }))
    assert.equal(button.hasAttribute('data-unplugin-pageflow-xpath-target'), false)
    assert.equal(detail.hasAttribute('data-unplugin-pageflow-xpath-target'), true)
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }))
    assert.deepEqual(messages, [{ type: 'unplugin-pageflow:xpath-selected', xpath: '/html/body/button/span/em' }])
  } finally {
    await server.close()
  }
})

test('updates the highlighted child while the pointer moves within one retargeting button', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createXPathSelectionController } = await server.ssrLoadModule('/src/runtime/xpath-selector.ts')
    const window = new Window({ url: 'http://localhost/page' })
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage() {} } })
    window.document.body.innerHTML = '<button><span class="first">First</span><span class="second">Second</span></button>'
    const button = window.document.querySelector('button')
    const first = window.document.querySelector('.first')
    const second = window.document.querySelector('.second')
    for (const element of [button, first, second])
      element.getBoundingClientRect = () => ({ width: 100, height: 20 })
    window.document.elementsFromPoint = x => [button, x < 50 ? first : second]

    const controller = createXPathSelectionController(window)
    controller.setEnabled(true)
    button.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 }))
    assert.equal(first.hasAttribute('data-unplugin-pageflow-xpath-target'), true)
    button.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 80, clientY: 10 }))
    assert.equal(first.hasAttribute('data-unplugin-pageflow-xpath-target'), false)
    assert.equal(second.hasAttribute('data-unplugin-pageflow-xpath-target'), true)
  } finally {
    await server.close()
  }
})

test('selects the application element through PageFlow hotspot overlays', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createXPathSelectionController } = await server.ssrLoadModule('/src/runtime/xpath-selector.ts')
    const window = new Window({ url: 'http://localhost/page' })
    const messages = []
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage: message => messages.push(message) } })
    window.document.body.innerHTML = '<input class="verification"><div data-unplugin-pageflow-hotspot-layer><a data-unplugin-pageflow-hotspot="link">Hotspot</a></div>'
    const input = window.document.querySelector('input')
    const layer = window.document.querySelector('[data-unplugin-pageflow-hotspot-layer]')
    const hotspot = layer.querySelector('a')
    for (const element of [input, layer, hotspot])
      element.getBoundingClientRect = () => ({ width: 100, height: 20 })
    window.document.elementsFromPoint = () => [hotspot, layer, input]

    const controller = createXPathSelectionController(window)
    controller.setEnabled(true)
    assert.equal(window.document.documentElement.hasAttribute('data-unplugin-pageflow-xpath-mode'), true)
    assert.match([...window.document.styleSheets].flatMap(sheet => [...sheet.cssRules]).map(rule => rule.cssText).join('\n'), /hotspot-layer/)
    hotspot.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 }))
    assert.equal(hotspot.hasAttribute('data-unplugin-pageflow-xpath-target'), false)
    assert.equal(input.hasAttribute('data-unplugin-pageflow-xpath-target'), true)
    hotspot.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }))
    assert.deepEqual(messages, [{ type: 'unplugin-pageflow:xpath-selected', xpath: '/html/body/input' }])
    controller.setEnabled(false)
    assert.equal(window.document.documentElement.hasAttribute('data-unplugin-pageflow-xpath-mode'), false)
  } finally {
    await server.close()
  }
})
