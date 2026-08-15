import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('rebuilds the Chrome distribution after a GitHub release is published', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8')

  assert.match(workflow, /^  release:\r?\n    types: \[published\]$/m)
  assert.match(workflow, /name: Build signed Chrome extension/)
  assert.match(workflow, /name: Probe deployed Chrome distribution/)
})
