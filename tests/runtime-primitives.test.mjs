import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('shares link discovery, labels, and mapped hotspot centers across runtimes', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const window = new Window({ url: 'https://example.com/home' })
  try {
    const runtime = await server.ssrLoadModule('/packages/pageflow-runtime/src/index.ts')
    window.document.body.innerHTML = `
      <a id="labelled" href="/detail#section" aria-label="详情页">忽略文本</a>
      <a href="https://outside.example/path">站外页面</a>
    `
    const [link] = runtime.pageFlowInternalLinks(window.document)
    assert.equal(link.target.href, 'https://example.com/detail')
    assert.equal(runtime.pageFlowLinkLabel(link.element, 'fallback'), '详情页')
    assert.deepEqual(runtime.pageFlowHotspotCenter(link.element, { left: 100, top: 50, width: 200, height: 100 }), {
      centerX: 200 / window.innerWidth,
      centerY: 100 / window.innerHeight,
    })
    const frame = window.document.createElement('iframe')
    window.document.body.append(frame)
    const nestedLink = frame.contentDocument.createElement('a')
    frame.contentDocument.body.append(nestedLink)
    assert.deepEqual(runtime.pageFlowHotspotCenter(
      nestedLink,
      { left: 100, top: 50, width: 200, height: 100 },
      window.document,
    ), {
      centerX: 200 / window.innerWidth,
      centerY: 100 / window.innerHeight,
    })
  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})
