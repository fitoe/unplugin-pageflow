import assert from 'node:assert/strict'
import test from 'node:test'
import { resolvePreviewUrl } from '../src/client/preview.ts'
import {
  deletePageFlowInternalParams,
  hasPageFlowInspection,
  hasPageFlowPreview,
  pageFlowPreviewRole,
} from '../src/shared/protocol.ts'

const config = {
  appUrl: '/app/',
  dynamicParams: {},
  previewRoles: [{ match: '/inspection/**', role: 'inspection' }],
}

test('preview URLs use the canonical PageFlow protocol', () => {
  assert.equal(
    resolvePreviewUrl('/inspection/home', config, 'http://localhost'),
    '/app/inspection/home?__unplugin-pageflow_preview=1&__unplugin-pageflow_role=inspection',
  )
  assert.equal(
    resolvePreviewUrl('/inspection/home', config, 'http://localhost', 'hash'),
    '/app/?__unplugin-pageflow_preview=1&__unplugin-pageflow_role=inspection#/inspection/home',
  )
})

test('canonical and legacy preview protocol parameters are both readable', () => {
  const canonical = new URLSearchParams('__unplugin-pageflow_preview=1&__unplugin-pageflow_role=farmer&__unplugin-pageflow_inspect=1')
  assert.equal(hasPageFlowPreview(canonical), true)
  assert.equal(hasPageFlowInspection(canonical), true)
  assert.equal(pageFlowPreviewRole(canonical), 'farmer')

  const legacy = new URLSearchParams('__unplugin_pageflow_preview=1&__unplugin_pageflow_role=operator&__unplugin_pageflow_inspect=1')
  assert.equal(hasPageFlowPreview(legacy), true)
  assert.equal(hasPageFlowInspection(legacy), true)
  assert.equal(pageFlowPreviewRole(legacy), 'operator')
})

test('internal protocol parameters are removed without touching application parameters', () => {
  const params = new URLSearchParams([
    ['tab', 'orders'],
    ['__unplugin-pageflow_preview', '1'],
    ['__unplugin-pageflow_role', 'farmer'],
    ['__unplugin-pageflow_inspect', '1'],
    ['__unplugin_pageflow_preview', '1'],
    ['__unplugin_pageflow_role', 'legacy'],
    ['__unplugin_pageflow_inspect', '1'],
  ])
  deletePageFlowInternalParams(params)
  assert.equal(params.toString(), 'tab=orders')
})
