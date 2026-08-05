import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('validates, replaces, and restores Chrome thumbnail cache records', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { parseStoredHostThumbnails, storedHostThumbnailRecords, upsertStoredHostThumbnail } = await server.ssrLoadModule('/src/client/host-thumbnails.ts')
    const old = { pageId: '/a', mode: 'pc', revision: '1', source: 'data:old', width: 300, height: 600, pageHeight: 900, updatedAt: 1 }
    const next = { ...old, revision: '2', source: 'data:new', updatedAt: 2 }
    assert.deepEqual(parseStoredHostThumbnails([old, { ...old, pageHeight: undefined }, { pageId: '/broken' }, null]), [old])
    assert.deepEqual(upsertStoredHostThumbnail([old], next), [next])
    assert.deepEqual(storedHostThumbnailRecords(next).map(record => [record.slot, record.revision, record.height, record.pageHeight]), [
      ['pc:compact:/a', '2', 600, 900],
      ['pc:full:/a', '2', 600, 900],
    ])
  } finally {
    await server.close()
  }
})
