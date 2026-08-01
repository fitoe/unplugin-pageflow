import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('formats Lighthouse scores and keeps only failed applicable audits', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { pageFlowLighthouseReport } = await server.ssrLoadModule('/src/plugin/lighthouse.ts')
    const report = pageFlowLighthouseReport({
      finalDisplayedUrl: 'http://localhost/profile',
      fetchTime: '2026-08-01T00:00:00.000Z',
      categories: {
        performance: { score: 0.91 },
        accessibility: { score: 0.82 },
        'best-practices': { score: null },
        seo: { score: 1 },
      },
      audits: {
        passed: { id: 'passed', title: 'Passed', description: '', score: 1, scoreDisplayMode: 'binary' },
        failed: { id: 'failed', title: 'Failed', description: 'Fix it. [Learn more](https://example.com/fix).', score: 0, scoreDisplayMode: 'binary', displayValue: '2 errors' },
        ignored: { id: 'ignored', title: 'Ignored', description: '', score: 0, scoreDisplayMode: 'notApplicable' },
      },
    })

    assert.deepEqual(report.scores, { performance: 91, accessibility: 82, 'best-practices': null, seo: 100 })
    assert.deepEqual(report.issues.map(issue => issue.id), ['failed'])
    assert.equal(report.issues[0].description, 'Fix it. Learn more.')
    assert.equal(report.issues[0].helpUrl, 'https://example.com/fix')
    assert.equal(report.url, 'http://localhost/profile')
  } finally {
    await server.close()
  }
})
