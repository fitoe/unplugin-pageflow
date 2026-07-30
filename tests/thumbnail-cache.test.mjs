import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { createServer } from 'vite'

test('persists thumbnails and bounds memory to manifest metadata', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'unplugin-pageflow-'))
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createThumbnailCache } = await server.ssrLoadModule('/src/plugin/thumbnail-cache.ts')
    const cache = createThumbnailCache(directory)
    const image = new Uint8Array([1, 2, 3, 4])
    const record = await cache.write('pc:full:home:tile:0', 'revision-1', 240, 360, 'image/webp', image, {
      pageHeight: 720,
      tileCount: 2,
      tileIndex: 0,
      tileTop: 0,
    })

    assert.equal(record.height, 360)
    assert.equal(record.tileCount, 2)
    assert.equal((await cache.manifest())['pc:full:home:tile:0'].revision, 'revision-1')

    const reopened = createThumbnailCache(directory)
    const persisted = await reopened.read('pc:full:home:tile:0')
    assert.deepEqual([...persisted.data], [...image])
    assert.equal(persisted.record.file, record.file)

    const bounded = createThumbnailCache(join(directory, 'bounded'), 6)
    await bounded.write('pc:compact:first', 'one', 1, 1, 'image/webp', new Uint8Array([1, 2, 3, 4]))
    await bounded.write('pc:compact:second', 'one', 1, 1, 'image/webp', new Uint8Array([5, 6, 7, 8]))
    const boundedManifest = await bounded.manifest()
    assert.equal(boundedManifest['pc:compact:first'], undefined)
    assert.equal(boundedManifest['pc:compact:second'].bytes, 4)
  } finally {
    await server.close()
    assert(resolve(directory).startsWith(resolve(tmpdir())))
    await rm(directory, { recursive: true, force: true })
  }
})
