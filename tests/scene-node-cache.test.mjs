import assert from 'node:assert/strict'
import test from 'node:test'
import * as napiCanvas from '@napi-rs/canvas'
import { Group, Rect, useCanvas } from '@leafer/node'
import { createServer } from 'vite'

useCanvas('napi', napiCanvas)

test('reuses, replaces, and removes Leafer scene nodes by signature', async () => {
  const server = await createServer({
    configFile: false,
    resolve: { alias: { 'leafer-ui': '@leafer/node' } },
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  try {
    const { SceneNodeCache } = await server.ssrLoadModule('/src/client/scene-node-cache.ts')
    const layer = new Group()
    const cache = new SceneNodeCache(layer)
    let creates = 0
    const first = cache.upsert('home', 'one', () => {
      creates++
      return new Rect({ width: 100, height: 100 })
    }, node => node.set({ x: 10 }))
    const reused = cache.upsert('home', 'one', () => {
      creates++
      return new Rect()
    }, node => node.set({ x: 20 }))
    assert.equal(reused, first)
    assert.equal(first.x, 20)
    assert.equal(creates, 1)

    const replacement = cache.upsert('home', 'two', () => new Rect({ width: 120 }), () => {})
    assert.notEqual(replacement, first)
    assert.equal(first.destroyed, true)
    cache.upsert('detail', 'one', () => new Rect(), () => {})
    cache.retain(new Set(['detail']))
    assert.equal(replacement.destroyed, true)
    assert.equal(cache.size, 1)
    cache.clear()
    assert.equal(cache.size, 0)
    assert.equal(layer.children.length, 0)
  } finally {
    await server.close()
  }
})
