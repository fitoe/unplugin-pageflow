import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('adapts framework routes and preserves browser navigation parameters', async () => {
  const window = new Window({ url: 'http://localhost/about?from=home' })
  Object.assign(globalThis, { window, document: window.document, URL: window.URL })
  window.__UNPLUGIN_PAGEFLOW_ROUTES__ = [
    { id: 'index', path: '/', title: 'index' },
    { id: 'about', path: '/about', title: 'about' },
  ]
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { findBrowserHistoryAdapter } = await server.ssrLoadModule('/src/runtime/adapters/browser-history.ts')
    const adapter = findBrowserHistoryAdapter()
    assert(adapter)
    assert.equal(adapter.currentPath(), '/about')
    assert.deepEqual(adapter.resolve('/about?from=card#bio'), { path: '/about', location: '/about?from=card#bio' })
    assert.equal(adapter.resolve('https://example.com/about'), undefined)

    const navigations = []
    adapter.interceptNavigation((navigation, method) => navigations.push({ navigation, method }))
    window.history.pushState({}, '', '/about?from=hotspot')
    assert.deepEqual(navigations, [{ navigation: { path: '/about', location: '/about?from=hotspot' }, method: 'pushState' }])
  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})
