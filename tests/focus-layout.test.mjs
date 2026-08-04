import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('positions focused targets and connects hotspot centers to page edges', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createFocusScene, resolveFocusTargetPageIds } = await server.ssrLoadModule('/src/client/focus-layout.ts')
    const page = (id, path) => ({ id, path, title: id, accent: '#fff', links: [] })
    const pages = [page('source', '/source'), page('right', '/right')]
    const scene = createFocusScene({
      pages,
      focusedPageId: 'source',
      links: [{ label: 'Open', to: '/right', hotspot: { centerX: 0.9, centerY: 0.25 } }],
      positions: new Map([['source', [100, 100]]]),
      targetPositions: { right: [500, 200] },
      pagePreviewHeight: () => 852,
      pageCardHeight: () => 920,
      selectedPageScale: 1.03,
    })
    assert.equal(scene.targets.length, 1)
    assert.deepEqual([scene.targets[0].side, scene.targets[0].x, scene.targets[0].y], ['right', 500, 200])
    assert.equal(scene.connections.length, 1)
    const coordinates = scene.connections[0].d.match(/-?\d+(?:\.\d+)?/g).map(Number)
    assert(Math.abs(coordinates[0] - 318.88) < 0.01)
    assert(Math.abs(coordinates[1] - 306.61) < 0.01)
    assert.equal(coordinates.at(-2), 500)
    assert.equal(coordinates.at(-1), 430)

    const repeated = createFocusScene({
      pages,
      focusedPageId: 'source',
      links: [0.2, 0.4, 0.6, 0.8].map((centerY, index) => ({
        label: `Row ${index}`,
        to: '/right',
        hotspot: { centerX: 0.5, centerY },
      })),
      positions: new Map([['source', [100, 100]]]),
      targetPositions: {},
      pagePreviewHeight: () => 852,
      pageCardHeight: () => 920,
    })
    assert.equal(repeated.targets.length, 1)
    assert.equal(repeated.connections.length, 1)

    assert.deepEqual(
      resolveFocusTargetPageIds(pages, [{ label: 'By id', to: 'right' }], 'source'),
      ['right'],
    )
  } finally {
    await server.close()
  }
})
