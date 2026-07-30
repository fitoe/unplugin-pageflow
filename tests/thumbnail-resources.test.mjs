import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('evicts thumbnail object URLs with a fixed LRU budget', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { ThumbnailResourceCache } = await server.ssrLoadModule('/src/client/thumbnail-resources.ts')
    const revoked = []
    const cache = new ThumbnailResourceCache(2, {
      fetchBlob: async url => ({ url }),
      createObjectUrl: blob => `blob:${blob.url}`,
      revokeObjectUrl: url => revoked.push(url),
    })

    await cache.load('a')
    await cache.load('b')
    cache.get('a')
    await cache.load('c')
    cache.trim(new Set(['c']))

    assert.equal(cache.size, 2)
    assert.deepEqual(revoked, ['blob:b'])
    cache.dispose()
    assert.equal(cache.size, 0)
    assert.deepEqual(new Set(revoked), new Set(['blob:a', 'blob:b', 'blob:c']))
  } finally {
    await server.close()
  }
})
