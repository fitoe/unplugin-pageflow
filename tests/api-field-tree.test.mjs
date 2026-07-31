import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('groups flattened API fields into collapsible object and array branches', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { buildApiFieldTree } = await server.ssrLoadModule('/src/client/api-field-tree.ts')
    assert.deepEqual(buildApiFieldTree([
      { path: 'user.name', value: 'Ada', used: true },
      { path: 'user.roles[0].name', value: 'admin', used: false },
      { path: 'user.roles[1].name', value: 'editor', used: true },
    ]), [{
      key: 'user', label: 'user', path: 'user', used: true, children: [
        { key: 'user.name', label: 'name', path: 'user.name', value: 'Ada', used: true, children: [] },
        { key: 'user.roles', label: 'roles', path: 'user.roles', used: true, children: [
          { key: 'user.roles[0]', label: '[0]', path: 'user.roles[0]', used: false, children: [
            { key: 'user.roles[0].name', label: 'name', path: 'user.roles[0].name', value: 'admin', used: false, children: [] },
          ] },
          { key: 'user.roles[1]', label: '[1]', path: 'user.roles[1]', used: true, children: [
            { key: 'user.roles[1].name', label: 'name', path: 'user.roles[1].name', value: 'editor', used: true, children: [] },
          ] },
        ] },
      ],
    }])
  } finally {
    await server.close()
  }
})
