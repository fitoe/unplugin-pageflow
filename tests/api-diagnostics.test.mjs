import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('classifies failed, slow, large, and duplicate API requests', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createApiIssues, mergeApiResult } = await server.ssrLoadModule('/src/client/api-diagnostics.ts')
    const options = { slowRequestMs: 1_000, largeResponseBytes: 500_000, duplicateWindowMs: 1_000 }
    const issues = createApiIssues([
      { id: 'ok', method: 'GET', url: '/api/ok', status: 200, duration: 30, responseSize: 10, fields: [] },
      { id: 'failed', method: 'POST', url: '/api/orders', status: 500, duration: 50, fields: [] },
      { id: 'network', method: 'GET', url: '/api/offline', status: 0, duration: 20, fields: [] },
      { id: 'slow', method: 'GET', url: '/api/slow', status: 200, duration: 1_500, fields: [] },
      { id: 'large', method: 'GET', url: '/api/large', status: 200, duration: 30, responseSize: 600_000, fields: [] },
      { id: 'duplicate', method: 'GET', url: '/api/repeated', status: 200, duration: 30, occurrences: 3, lastIntervalMs: 250, fields: [] },
    ], options)
    assert.deepEqual(issues.map(issue => [issue.resultId, issue.status]), [
      ['failed', 'failed'],
      ['network', 'failed'],
      ['slow', 'warning'],
      ['large', 'warning'],
      ['duplicate', 'warning'],
    ])
    assert.match(issues.find(issue => issue.resultId === 'duplicate').descriptions[0], /累计 3 次/)

    const merged = [
      { id: 'first', method: 'GET', url: '/api/orders?page=1', status: 200, duration: 30, occurredAt: 100, fields: [] },
      { id: 'second', method: 'POST', url: '/api/orders', status: 200, duration: 40, occurredAt: 120, fields: [] },
    ].reduce(mergeApiResult, [])
    const repeated = mergeApiResult(merged, {
      id: 'third', method: 'GET', url: 'http://localhost/api/orders?page=2&_t=123', status: 200, duration: 35, occurredAt: 180, fields: [],
    })
    assert.equal(repeated.length, 2)
    assert.deepEqual(repeated.find(result => result.method === 'GET'), {
      id: 'GET:/api/orders', method: 'GET', url: 'http://localhost/api/orders?page=2&_t=123', status: 200,
      duration: 35, occurredAt: 180, fields: [], occurrences: 2, lastIntervalMs: 80,
    })
  } finally {
    await server.close()
  }
})
