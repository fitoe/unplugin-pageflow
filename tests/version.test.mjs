import assert from 'node:assert/strict'
import test from 'node:test'
import { formatPageFlowVersion, resolvePageFlowVersion } from '../scripts/pageflow-version.mjs'

test('derives a monotonically increasing Chrome-compatible build version', () => {
  assert.equal(formatPageFlowVersion('1.2.3', 456), '1.2.3.456')
  assert.equal(formatPageFlowVersion('2.0.0-beta.1', 7), '2.0.0.7')
  assert.match(resolvePageFlowVersion(), /^\d+\.\d+\.\d+\.\d+$/)
  assert.throws(() => formatPageFlowVersion('invalid', 1), /Invalid PageFlow package version/)
})
