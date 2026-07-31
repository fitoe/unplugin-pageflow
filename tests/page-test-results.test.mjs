import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createServer } from 'vite'

test('persists page test results and invalidates changed test files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pageflow-test-results-'))
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createPageTestResultCache } = await server.ssrLoadModule('/src/plugin/page-test-results.ts')
    const testCase = { id: 'login-test', revision: 'revision-a' }
    const first = createPageTestResultCache(directory)
    await first.write(testCase, { status: 'passed', duration: 42, output: 'ok' })

    const restored = await createPageTestResultCache(directory).read(testCase)
    assert.deepEqual(restored, { status: 'passed', duration: 42, output: 'ok' })
    assert.equal(await createPageTestResultCache(directory).read({ ...testCase, revision: 'revision-b' }), undefined)
  } finally {
    await server.close()
    await rm(directory, { recursive: true, force: true })
  }
})
