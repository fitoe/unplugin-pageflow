import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('user sessions deduplicate users and persist global and page selections', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { configuredUsers, loadUserSessions, saveUserSessions } = await server.ssrLoadModule('/src/client/user-sessions.ts')
    assert.deepEqual(configuredUsers([{ role: 'admin' }, { role: 'buyer' }, { role: 'admin' }]), ['admin', 'buyer'])
    const values = new Map()
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
    saveUserSessions({ users: ['admin', 'buyer'], activeUser: 'admin', pageUsers: { checkout: 'buyer' } }, storage)
    assert.deepEqual(loadUserSessions(storage), { users: ['admin', 'buyer'], activeUser: 'admin', pageUsers: { checkout: 'buyer' } })
  } finally {
    await server.close()
  }
})
