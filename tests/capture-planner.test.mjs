import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('plans stale, priority, route-order, and manual capture work', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { canAutomaticallyCapturePage, planNextCapture } = await server.ssrLoadModule('/src/client/capture-planner.ts')
    assert.equal(canAutomaticallyCapturePage({ virtual: false }), true)
    assert.equal(canAutomaticallyCapturePage({ virtual: true }), false)
    const page = (id, routeOrder) => ({ id, routeOrder, path: `/${id}`, title: id, accent: '#fff', links: [] })
    const pages = [page('later', 3), page('visible', 4), page('first', 1), page('current', 2), page('failed', 0)]
    const options = {
      pages,
      batchIds: ['removed'],
      manualIds: [],
      priorityIds: new Set(['visible']),
      failedIds: new Set(['failed']),
      isCurrent: item => item.id === 'current',
      canCaptureAutomatically: () => true,
    }

    const background = planNextCapture(options)
    assert.deepEqual([...background.batchIds], ['visible', 'first', 'later'])
    assert.equal(background.pageId, 'visible')
    assert.equal(background.manual, false)
    assert.equal(background.priority, true)

    const retained = planNextCapture({ ...options, batchIds: ['later', 'removed'] })
    assert.deepEqual([...retained.batchIds], ['later'])
    assert.equal(retained.pageId, 'later')
    assert.equal(retained.priority, false)

    const manual = planNextCapture({ ...options, batchIds: ['later'], manualIds: ['first'] })
    assert.deepEqual([...manual.batchIds], ['later', 'first'])
    assert.equal(manual.pageId, 'first')
    assert.equal(manual.manual, true)

    const staleWithStoredThumbnail = planNextCapture({
      ...options,
      batchIds: ['visible'],
      canCaptureAutomatically: () => false,
    })
    assert.deepEqual([...staleWithStoredThumbnail.batchIds], [])
    assert.equal(staleWithStoredThumbnail.pageId, undefined)

    const manualStoredThumbnail = planNextCapture({
      ...options,
      batchIds: [],
      manualIds: ['first'],
      canCaptureAutomatically: () => false,
    })
    assert.deepEqual([...manualStoredThumbnail.batchIds], ['first'])
    assert.equal(manualStoredThumbnail.pageId, 'first')
    assert.equal(manualStoredThumbnail.manual, true)
  } finally {
    await server.close()
  }
})
