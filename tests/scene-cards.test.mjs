import assert from 'node:assert/strict'
import test from 'node:test'
import * as napiCanvas from '@napi-rs/canvas'
import { useCanvas } from '@leafer/node'
import { createServer } from 'vite'

useCanvas('napi', napiCanvas)

test('builds reusable page cards and real-page deck layers', async () => {
  const server = await createServer({
    configFile: false,
    resolve: { alias: { 'leafer-ui': '@leafer/node' } },
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  try {
    const { createPageCardGroup, createPageDeckGroup } = await server.ssrLoadModule('/src/client/scene-cards.ts')
    const page = id => ({ id, title: `Title ${id}`, path: `/${id}`, accent: '#fff', links: [] })
    const card = createPageCardGroup({
      page: page('home'),
      x: 10,
      y: 20,
      previewHeight: 852,
      tiles: [],
      thumbnailSource: () => undefined,
      orphan: true,
    })
    assert.deepEqual([card.x, card.y, card.children.length], [10, 20, 3])
    assert.equal(card.children[0].stroke, '#a3a3a3')
    assert.equal(card.children[0].strokeWidth, 2)
    assert.deepEqual(card.children.slice(1).map(child => child.text), ['Title home', '/home'])

    const layers = [page('index'), page('detail')]
    const deck = createPageDeckGroup({
      x: 100,
      y: 200,
      previewHeight: 852,
      label: 'orders',
      routePath: '/orders',
      count: 2,
      layerPages: layers,
      createLayer: (layerPage, x, y) => createPageCardGroup({
        page: layerPage,
        x,
        y,
        previewHeight: 852,
        tiles: [],
        thumbnailSource: () => undefined,
      }),
    })
    assert.equal(deck.children.length, 4)
    assert.deepEqual(deck.children.slice(0, 2).map(child => [child.x, Math.abs(child.y), child.opacity]), [
      [7, 7, 0.84],
      [0, 0, 1],
    ])
    assert.equal(deck.children[2].text, 'orders · 2')
    assert.equal(deck.children[3].text, '/orders')
    assert.equal(deck.children[3].fontFamily, 'ui-monospace, Cascadia Code, SFMono-Regular, Consolas, monospace')
  } finally {
    await server.close()
  }
})
