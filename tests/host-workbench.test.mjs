import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('adapts Chrome host state without leaking host rendering rules into the Vite runtime', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { hostHotspotRects, hostStateToGraph } = await server.ssrLoadModule('/src/client/host-workbench.ts')
    const state = {
      currentUrl: 'https://example.com/list?page=2',
      pages: [
        { url: 'https://example.com/list?page=2', routeKey: 'https://example.com/list', title: 'List', updatedAt: 1 },
        { url: 'https://example.com/detail/1', routeKey: 'https://example.com/detail/:id', title: 'Detail', updatedAt: 2 },
      ],
      edges: [
        { id: 'edge', from: 'https://example.com/list', to: 'https://example.com/detail/:id', occurrences: 1, hotspot: { centerX: 0.5, centerY: 0.25, width: 0.2, height: 0.1 } },
        { id: 'offscreen', from: 'https://example.com/list', to: 'https://example.com/list', occurrences: 1 },
      ],
      requests: [],
      diagnostics: [],
    }
    const graph = hostStateToGraph(state, ['#123456'])
    assert.equal(graph.currentPageId, 'https://example.com/list')
    assert.equal(graph.navigationLocations['/list'], '/list?page=2')
    assert.equal(graph.pages[0].links[0].to, '/detail/:id')
    assert.equal(graph.pages[0].links.length, 1)

    const rects = hostHotspotRects([
      { label: 'Link', to: '/a', hotspot: { centerX: 0.5, centerY: 0.25, width: 0.2, height: 0.1 } },
      { label: 'Event', to: '/b', kind: 'event', hotspot: { centerX: 0.75, centerY: 0.5 } },
    ], { x: 100, y: 200, width: 300, height: 600, scale: 2 })
    assert.deepEqual(rects[0], {
      id: 'link:0.5:0.25', x: 340, y: 440, width: 120, height: 120,
      fill: 'rgba(255, 92, 168, 0.2)', stroke: '#ff5ca8',
    })
    assert.equal(rects[1].stroke, '#65bfff')
    assert.equal(rects[1].width, 1)
  } finally {
    await server.close()
  }
})
