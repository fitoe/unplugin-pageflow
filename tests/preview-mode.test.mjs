import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('chooses the first preview mode from the project framework and preserves user choice', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { initialPreviewMode } = await server.ssrLoadModule('/src/client/preview-mode.ts')
    assert.equal(initialPreviewMode(null, 'uni-app'), 'mobile')
    assert.equal(initialPreviewMode(null, 'vue'), 'pc')
    assert.equal(initialPreviewMode(null, 'next'), 'pc')
    assert.equal(initialPreviewMode('tablet', 'uni-app'), 'tablet')
  } finally {
    await server.close()
  }
})
