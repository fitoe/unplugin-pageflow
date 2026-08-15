import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('page health uses totals for every badge and preserves risk detail', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createPageHealth } = await server.ssrLoadModule('/src/client/page-health.ts')
    const health = createPageHealth({
      apiTotal: 1,
      apiIssues: 0,
      checks: [
        { id: 'entry', status: 'passed' },
        { id: 'links', status: 'uncovered' },
      ],
      tests: Array.from({ length: 6 }, (_, index) => ({ status: index === 0 ? 'failed' : 'unknown' })),
      diagnostics: [
        ...Array.from({ length: 7 }, () => ({ severity: 'warning' })),
        ...Array.from({ length: 19 }, () => ({ severity: 'suggestion' })),
      ],
      todos: [],
      preview: 'live',
    })
    assert.equal(health.api.badge, '1')
    assert.equal(health.tests.badge, '6 · 2风险')
    assert.equal(health.diagnostics.badge, '26 · 7警告')
    assert.equal(health.todos.badge, '0')
    assert.equal(health.severity, 'error')
  } finally {
    await server.close()
  }
})
