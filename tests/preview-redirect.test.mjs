import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('detects redirects without treating preview query changes as redirects', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { detectUnexpectedPreviewRedirect } = await server.ssrLoadModule('/src/client/preview-redirect.ts')
    assert.equal(detectUnexpectedPreviewRedirect(
      '/pages/farmer/mine/index?__unplugin_pageflow_preview=1&__unplugin_pageflow_role=farmer',
      '/pages/farmer/mine/index?tab=profile',
      'history',
      'http://localhost',
    ), undefined)
    assert.deepEqual(detectUnexpectedPreviewRedirect(
      '/pages/farmer/mine/index?__unplugin_pageflow_preview=1',
      '/pages/select-role/index',
      'history',
      'http://localhost',
    ), { expectedPath: '/pages/farmer/mine/index', actualPath: '/pages/select-role/index' })
    assert.deepEqual(detectUnexpectedPreviewRedirect(
      '/?__unplugin_pageflow_preview=1#/pages/farmer/mine/index',
      '/#/pages/select-role/index',
      'hash',
      'http://localhost',
    ), { expectedPath: '/pages/farmer/mine/index', actualPath: '/pages/select-role/index' })
  } finally {
    await server.close()
  }
})
