import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('unplugin graph converts to the shared host state', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { graphToHostState } = await server.ssrLoadModule('/src/client/unplugin-host.ts')
    const config = {
      appUrl: '/app/', dynamicParams: {}, previewRoles: [],
    }
    const state = graphToHostState({
      routeMode: 'history', version: 1,
      pages: [
        { id: 'home', path: '/', title: '首页', accent: '#fff', links: [{ label: '详情', to: '/detail' }] },
        { id: 'detail', path: '/detail', title: '详情', accent: '#fff', links: [] },
      ],
    }, config, [], 'http://pageflow.test')

    assert.deepEqual(state.pages.map(page => page.url), [
      'http://pageflow.test/app/?__unplugin-pageflow_preview=1',
      'http://pageflow.test/app/detail?__unplugin-pageflow_preview=1',
    ])
    assert.equal(state.edges.length, 1)
    assert.equal(state.edges[0].from, state.pages[0].url)
    assert.equal(state.edges[0].to, state.pages[1].url)
  } finally {
    await server.close()
  }
})
