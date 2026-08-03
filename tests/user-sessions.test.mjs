import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('user sessions deduplicate users and persist global and page selections', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { cachedPreviewUsers, configuredUsers, isPreviewUserStorageKey, loadUserSessions, saveUserSessions, visibleSessionUsers } = await server.ssrLoadModule('/src/client/user-sessions.ts')
    assert.deepEqual(configuredUsers([{ role: 'admin' }, { role: 'buyer' }, { role: 'admin' }]), ['admin', 'buyer'])
    assert.deepEqual(visibleSessionUsers(['默认用户', 'admin', 'Alice'], [{ role: 'admin' }, { role: 'buyer' }], ['admin']), ['admin', 'buyer', 'Alice'])
    assert.deepEqual(visibleSessionUsers([], [{ role: 'admin' }], []), ['admin'])
    const cachedKeys = ['other', 'unplugin-pageflow:page-state:admin:%2Fhome:dom', 'unplugin-pageflow:page-state:buyer:%2Forders:dom']
    assert.deepEqual(cachedPreviewUsers({ length: cachedKeys.length, key: index => cachedKeys[index] }), ['admin', 'buyer'])
    assert.equal(isPreviewUserStorageKey(cachedKeys[1]), true)
    assert.equal(isPreviewUserStorageKey('other'), false)
    const values = new Map()
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
    saveUserSessions({ users: ['admin', 'buyer'], notes: { admin: '管理员账号' }, activeUser: 'admin', pageUsers: { checkout: 'buyer' } }, storage)
    assert.deepEqual(loadUserSessions(storage), { users: ['admin', 'buyer'], notes: { admin: '管理员账号' }, activeUser: 'admin', pageUsers: { checkout: 'buyer' } })
    values.set('unplugin-pageflow:user-sessions', JSON.stringify({ users: ['legacy-role'], notes: {}, pageUsers: {} }))
    assert.deepEqual(loadUserSessions(storage).users, [])
  } finally {
    await server.close()
  }
})
