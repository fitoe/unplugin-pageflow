import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('plans stale, priority, route-order, and manual capture work', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { planNextCapture } = await server.ssrLoadModule('/src/client/capture-planner.ts')
    const page = (id, routeOrder) => ({ id, routeOrder, path: `/${id}`, title: id, accent: '#fff', links: [] })
    const pages = [page('later', 3), page('visible', 4), page('first', 1), page('current', 2), page('failed', 0)]
    const options = {
      pages,
      batchIds: ['removed'],
      manualIds: [],
      priorityIds: new Set(['visible']),
      failedIds: new Set(['failed']),
      isCurrent: item => item.id === 'current',
    }

    const background = planNextCapture(options)
    assert.deepEqual([...background.batchIds], ['visible', 'first', 'later'])
    assert.equal(background.pageId, 'visible')
    assert.equal(background.manual, false)

    const retained = planNextCapture({ ...options, batchIds: ['later', 'removed'] })
    assert.deepEqual([...retained.batchIds], ['later'])
    assert.equal(retained.pageId, 'later')

    const manual = planNextCapture({ ...options, batchIds: ['later'], manualIds: ['first'] })
    assert.deepEqual([...manual.batchIds], ['later', 'first'])
    assert.equal(manual.pageId, 'first')
    assert.equal(manual.manual, true)
  } finally {
    await server.close()
  }
})
