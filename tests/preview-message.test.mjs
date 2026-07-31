import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('decodes supported preview messages and rejects malformed payloads', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { decodePreviewMessage } = await server.ssrLoadModule('/src/client/preview-message.ts')

    assert.deepEqual(decodePreviewMessage({
      type: 'unplugin-pageflow:api-result',
      result: { id: '1', fields: [] },
    }), { type: 'api-result', result: { id: '1', fields: [] } })
    assert.deepEqual(decodePreviewMessage({ type: 'unplugin-pageflow:page-reported' }), { type: 'page-reported' })
    assert.deepEqual(decodePreviewMessage({
      type: 'unplugin-pageflow:hotspot-hover',
      targets: ['/one', 2, '/two'],
      hotspot: { centerX: 0.25, centerY: 0.75 },
    }), {
      type: 'hotspot-hover',
      targets: ['/one', '/two'],
      hotspot: { centerX: 0.25, centerY: 0.75 },
    })
    assert.deepEqual(decodePreviewMessage({
      type: 'unplugin-pageflow:scan-result',
      page: { path: '/home', links: [{ label: 'Detail', to: '/detail' }] },
    }), {
      type: 'scan-result',
      path: '/home',
      links: [{ label: 'Detail', to: '/detail' }],
    })
    assert.deepEqual(decodePreviewMessage({
      type: 'unplugin-pageflow:navigate',
      to: '/detail',
      location: '/detail?id=7',
      interaction: 'hotspot',
    }), {
      type: 'navigate',
      to: '/detail',
      location: '/detail?id=7',
      hotspot: true,
    })

    assert.equal(decodePreviewMessage(null), undefined)
    assert.equal(decodePreviewMessage({ type: 'unplugin-pageflow:api-result', result: {} }), undefined)
    assert.equal(decodePreviewMessage({ type: 'unplugin-pageflow:scan-result', page: {} }), undefined)
    assert.equal(decodePreviewMessage({ type: 'unplugin-pageflow:navigate', to: 7 }), undefined)
    assert.equal(decodePreviewMessage({ type: 'unknown' }), undefined)
  } finally {
    await server.close()
  }
})
