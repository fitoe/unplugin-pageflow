import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('keeps hotspot links native and drives the physical preview frame before handoff', async () => {
  const window = new Window({ url: 'http://localhost/#/pages/role-select' })
  const layer = window.document.createElement('div')
  const link = window.document.createElement('a')
  link.href = '#/pages/login?role=farmer&redirect=%2Fpages%2Findex'
  layer.append(link)
  window.document.body.append(layer)

  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { navigatePreviewFrame, resolvePreviewUrl, syncPreviewHotspotLayerVisibility } = await server.ssrLoadModule('/src/client/preview.ts')

    syncPreviewHotspotLayerVisibility(layer, true)
    assert.equal(layer.style.display, 'block')

    const click = new window.MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(click)
    assert.equal(click.defaultPrevented, false)
    assert.equal(link.getAttribute('href'), '#/pages/login?role=farmer&redirect=%2Fpages%2Findex')

    const frame = {
      contentWindow: { location: { href: 'http://localhost/?__unplugin-pageflow_preview=1#/pages/role-select' } },
      src: '',
    }
    const loginUrl = resolvePreviewUrl('/pages/login', {
      appUrl: '/',
      dynamicParams: {},
    }, 'http://localhost', 'hash', '/pages/login?role=farmer&redirect=%2Fpages%2Findex', 'farmer')
    assert.equal(loginUrl, '/?__unplugin-pageflow_preview=1&__unplugin-pageflow_role=farmer#/pages/login?role=farmer&redirect=%2Fpages%2Findex')
    assert.equal(navigatePreviewFrame(frame, loginUrl, 'http://localhost'), true)
    assert.equal(frame.src, `http://localhost${loginUrl}`)

    frame.contentWindow.location.href = frame.src
    frame.src = 'unchanged'
    assert.equal(navigatePreviewFrame(frame, loginUrl, 'http://localhost'), false)
    assert.equal(frame.src, 'unchanged')

    syncPreviewHotspotLayerVisibility(layer, false)
    assert.equal(layer.style.display, 'none')
  }
  finally {
    await server.close()
    await window.happyDOM.close()
  }
})
