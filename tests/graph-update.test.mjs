import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('plans graph synchronization without retaining removed preview state', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { planGraphUpdate } = await server.ssrLoadModule('/src/client/graph-update.ts')
    const page = (id, path = `/${id}`, title = id) => ({ id, path, title, accent: '#fff', links: [] })
    const home = page('home')
    const detail = page('detail')

    const removed = planGraphUpdate({
      pages: [home, detail],
      nextPages: [home],
      routeMode: 'history',
      nextRouteMode: 'history',
      livePreviewId: 'detail',
      livePreviewCacheIds: ['home', 'detail'],
      focusedPageId: 'detail',
      activeId: 'detail',
    })
    assert.equal(removed.layoutChanged, true)
    assert.equal(removed.livePreviewId, undefined)
    assert.deepEqual(removed.livePreviewCacheIds, ['home'])
    assert.equal(removed.focusedPageRemoved, true)
    assert.equal(removed.activeId, 'home')

    const modeChanged = planGraphUpdate({
      pages: [home],
      nextPages: [home],
      routeMode: 'history',
      nextRouteMode: 'hash',
      livePreviewId: 'home',
      livePreviewCacheIds: ['home'],
      focusedPageId: 'home',
      activeId: 'home',
    })
    assert.equal(modeChanged.routeModeChanged, true)
    assert.equal(modeChanged.livePreviewId, undefined)
    assert.deepEqual(modeChanged.livePreviewCacheIds, [])
    assert.equal(modeChanged.focusedPageRemoved, false)

    const metadataOnly = planGraphUpdate({
      pages: [home],
      nextPages: [page('home', '/home', 'Homepage')],
      routeMode: 'history',
      nextRouteMode: 'history',
      livePreviewCacheIds: [],
      activeId: 'home',
    })
    assert.equal(metadataOnly.layoutChanged, false)
    assert.equal(metadataOnly.status, 'Routes synced')

    const empty = planGraphUpdate({
      pages: [home],
      nextPages: [],
      routeMode: 'history',
      nextRouteMode: 'history',
      livePreviewCacheIds: [],
      activeId: 'home',
    })
    assert.equal(empty.activeId, '')
    assert.equal(empty.status, 'Waiting for Vue Router…')
  } finally {
    await server.close()
  }
})
