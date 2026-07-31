import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve } from 'node:path'
import { createServer } from 'vite'

test('associates page tests using explicit, import, convention, and route evidence', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { PageTestIndex } = await server.ssrLoadModule('/src/plugin/page-tests.ts')
    const root = resolve('tests/fixtures/page-tests')
    const index = new PageTestIndex(root, [
      { id: 'login', path: '/login', title: 'Login', componentFile: resolve(root, 'src/pages/login.tsx') },
      { id: 'profile', path: '/profile', title: 'Profile' },
      { id: 'order', path: '/orders/:id', title: 'Order' },
    ], {
      '/orders/**': ['tests/orders-*.spec.ts'],
    })
    await index.scan()

    const login = index.testsFor('/login')
    assert.deepEqual(login.map(item => item.name).sort(), [
      'returns to login',
      'shows invalid credentials',
      'submits valid credentials',
    ])
    assert(login.some(item => item.source === 'import'))
    assert(login.some(item => item.source === 'route'))
    assert(login.every(item => item.status === 'unknown'))

    const profile = index.testsFor('/profile')
    assert.deepEqual(profile.map(item => item.name), ['opens the profile page'])
    assert.equal(profile[0].kind, 'e2e')
    assert.equal(profile[0].source, 'route')

    const orders = index.testsFor('/orders/:id')
    assert.deepEqual(orders.map(item => item.name), ['creates an order'])
    assert.equal(orders[0].source, 'config')
  } finally {
    await server.close()
  }
})
