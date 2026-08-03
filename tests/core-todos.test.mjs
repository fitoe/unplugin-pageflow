import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('shares todo parsing and immutable updates between hosts', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { addPageFlowTodo, parsePageFlowTodos, removePageFlowTodo, togglePageFlowTodo } = await server.ssrLoadModule('/packages/pageflow-core/src/todos.ts')
    const parsed = parsePageFlowTodos({ '/screen': [{ id: '1', text: '检查地图', done: false }, null, { text: 'invalid' }] })
    assert.deepEqual(parsed, { '/screen': [{ id: '1', text: '检查地图', done: false }] })
    const added = addPageFlowTodo(parsed, '/screen', '  更新截图  ', '2')
    assert.equal(added['/screen'][1].text, '更新截图')
    const toggled = togglePageFlowTodo(added, '/screen', '2')
    assert.equal(toggled['/screen'][1].done, true)
    assert.deepEqual(removePageFlowTodo(toggled, '/screen', '1')['/screen'], [{ id: '2', text: '更新截图', done: true }])
  } finally {
    await server.close()
  }
})
