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
    await cache.write('pc:full:home:tile:1', 'revision-1', 240, 360, 'image/webp', image, {
      pageHeight: 720,
      tileCount: 2,
      tileIndex: 1,
      tileTop: 360,
    })
    const singleRecord = await cache.write('pc:full:home', 'revision-2', 240, 720, 'image/webp', image, { pageHeight: 720 })
    const singleImageManifest = await cache.manifest()
    assert.equal(singleImageManifest['pc:full:home'].revision, 'revision-2')
    assert.equal(singleImageManifest['pc:full:home:tile:0'], undefined)
    assert.equal(singleImageManifest['pc:full:home:tile:1'], undefined)

    const reopened = createThumbnailCache(directory)
    const persisted = await reopened.read('pc:full:home')
    assert.deepEqual([...persisted.data], [...image])
    assert.equal(persisted.record.file, singleRecord.file)

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
