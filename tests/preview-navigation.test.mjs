import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('keeps physical preview identity until the actual route confirms or redirects', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createPendingPreviewNavigation, observePreviewNavigation, previewRouteLocation } = await server.ssrLoadModule('/src/client/preview-navigation.ts')
    const navigation = createPendingPreviewNavigation({
      id: 7,
      framePageId: '/pages/role-select',
      sourcePageId: '/pages/role-select',
      sourcePath: '/pages/role-select',
      targetPageId: '/pages/login',
      targetPath: '/pages/login',
      location: '/pages/login?role=farmer&redirect=%2Fpages%2Findex',
      expectedUrl: 'http://localhost/?__unplugin-pageflow_preview=1#/pages/login?role=farmer&redirect=%2Fpages%2Findex',
      reason: '应用导航',
      startedAt: 10,
    })

    assert.deepEqual(observePreviewNavigation(navigation, '/pages/role-select'), {
      status: 'stale',
      path: '/pages/role-select',
      location: '/pages/role-select',
    })
    assert.deepEqual(observePreviewNavigation(navigation, '/pages/role-select', true), {
      status: 'redirected',
      path: '/pages/role-select',
      location: '/pages/role-select',
    })
    assert.deepEqual(observePreviewNavigation(navigation, '/pages/login?role=farmer&redirect=%2Fpages%2Findex'), {
      status: 'confirmed',
      path: '/pages/login',
      location: '/pages/login?role=farmer&redirect=%2Fpages%2Findex',
    })
    assert.deepEqual(observePreviewNavigation(navigation, '/pages/index'), {
      status: 'redirected',
      path: '/pages/index',
      location: '/pages/index',
    })
    assert.equal(previewRouteLocation(
      'http://localhost/?__unplugin-pageflow_preview=1#/pages/login?role=farmer&redirect=%2Fpages%2Findex',
      'hash',
      'http://localhost',
    ), '/pages/login?role=farmer&redirect=%2Fpages%2Findex')
  }
  finally {
    await server.close()
  }
})
