import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('selects only an uncached Chrome thumbnail candidate', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { nextMissingHostThumbnail } = await server.ssrLoadModule('/src/client/host-thumbnail-capture.ts')
    const pages = ['/active', '/cached', '/failed', '/next'].map(id => ({ id, path: id, title: id, accent: '#fff', links: [] }))
    const selected = nextMissingHostThumbnail(pages, {
      activePageId: '/active',
      attemptedIds: new Set(),
      failedIds: new Set(['/failed']),
      pageUrls: new Map(pages.map(page => [page.id, `https://example.com${page.path}`])),
      isCurrent: page => page.id === '/cached',
    })
    assert.equal(selected.id, '/next')
  } finally {
    await server.close()
  }
})
