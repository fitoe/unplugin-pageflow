import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('host storage migrates legacy todos and canvas keys', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { loadPageFlowCanvas, loadPageFlowTodos } = await server.ssrLoadModule('/packages/pageflow-core/src/host-storage.ts')
    const values = new Map([
      ['unplugin-pageflow:page-todos', { '/home': [{ id: '1', text: '修复', done: false }] }],
      ['canvas:http://app.test', { pages: [{ url: '/home' }] }],
    ])
    const host = {
      loadStorage: async key => values.get(key),
      saveStorage: async (key, value) => values.set(key, value),
      removeStorage: async key => values.delete(key),
    }

    assert.equal((await loadPageFlowTodos(host))['/home'][0].text, '修复')
    assert.deepEqual(await loadPageFlowCanvas(host, 'http://app.test'), { pages: [{ url: '/home' }] })
    assert(values.has('pageflow:todos'))
    assert(values.has('pageflow:canvas:http://app.test'))
    assert(!values.has('unplugin-pageflow:page-todos'))
    assert(!values.has('canvas:http://app.test'))
  } finally {
    await server.close()
  }
})
