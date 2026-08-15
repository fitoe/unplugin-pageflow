import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('rebuilds the Chrome distribution after a GitHub release is published', async () => {
  const [pagesWorkflow, ciWorkflow] = await Promise.all([
    readFile('.github/workflows/pages.yml', 'utf8'),
    readFile('.github/workflows/ci.yml', 'utf8'),
  ])

  assert.match(pagesWorkflow, /^  release:\r?\n    types: \[published\]$/m)
  assert.match(pagesWorkflow, /name: Build signed Chrome extension/)
  assert.match(pagesWorkflow, /name: Probe deployed Chrome distribution/)
  assert.match(ciWorkflow, /^      actions: write$/m)
  assert.match(ciWorkflow, /name: Redeploy versioned Chrome distribution\r?\n        run: gh workflow run pages\.yml --ref master/)
})
