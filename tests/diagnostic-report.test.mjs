import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('creates a versioned diagnostic report without session data', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createDiagnosticReport, diagnosticReportFilename } = await server.ssrLoadModule('/src/client/diagnostic-report.ts')
    const report = createDiagnosticReport(
      { title: '用户详情', path: '/users/:id' },
      [
        { id: 'a', ruleId: 'missing-alt', severity: 'error', category: 'accessibility', title: '图片缺少 alt', description: '补充 alt' },
        { id: 'b', ruleId: 'font-size', severity: 'warning', category: 'visual', title: '字号太小', description: '增大字号' },
      ],
      undefined,
      '2026-08-01T00:00:00.000Z',
    )

    assert.equal(report.schemaVersion, 1)
    assert.deepEqual(report.summary, { error: 1, warning: 1, suggestion: 0 })
    assert.equal(report.lighthouse, null)
    assert.equal(JSON.stringify(report).includes('localStorage'), false)
    assert.equal(diagnosticReportFilename('/users/:id'), 'pageflow-diagnostics-users-id.json')
  } finally {
    await server.close()
  }
})
