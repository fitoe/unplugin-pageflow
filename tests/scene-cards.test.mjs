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
    const { createPageCardGroup, createPageDeckGroup, pageCardMetaHit } = await server.ssrLoadModule('/src/client/scene-cards.ts')
    const page = id => ({ id, title: `Title ${id}`, path: `/${id}`, accent: '#fff', links: [] })
    const card = createPageCardGroup({
      page: page('home'),
      x: 10,
      y: 20,
      previewHeight: 852,
      tiles: [],
      thumbnailSource: () => undefined,
      copied: true,
      orphan: true,
    })
    assert.deepEqual([card.x, card.y, card.children.length], [10, 20, 6])
    assert.equal(card.children[0].stroke, '#a3a3a3')
    assert.equal(card.children[0].strokeWidth, 2)
    assert.deepEqual(card.children.slice(1).map(child => child.text), [
      'Title home', '/home', 'Title home', '→', '已复制',
    ])
    assert.equal(pageCardMetaHit(230, 870, 852), 'open')
    assert.equal(pageCardMetaHit(100, 870, 852), 'title')
    assert.equal(pageCardMetaHit(100, 895, 852), 'path')
    assert.equal(pageCardMetaHit(230, 895, 852), 'path')

    const layers = [page('index'), page('detail')]
    const deck = createPageDeckGroup({
      x: 100,
      y: 200,
      previewHeight: 852,
      label: 'orders',
      count: 2,
      layerPages: layers,
      createLayer: (layerPage, x, y) => createPageCardGroup({
        page: layerPage,
        x,
        y,
        previewHeight: 852,
        tiles: [],
        thumbnailSource: () => undefined,
        hideMeta: true,
      }),
    })
    assert.equal(deck.children.length, 3)
    assert.deepEqual(deck.children.slice(0, 2).map(child => [child.x, Math.abs(child.y), child.opacity]), [
      [7, 7, 0.84],
      [0, 0, 1],
    ])
    assert.equal(deck.children[2].text, 'orders · 2')
  } finally {
    await server.close()
  }
})
