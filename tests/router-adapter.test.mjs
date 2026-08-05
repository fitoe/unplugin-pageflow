import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('adapts Vue Router discovery, routes, locations, and intercepted navigation', async () => {
  const window = new Window({ url: 'http://localhost/app/home' })
  Object.assign(globalThis, { window, document: window.document })
  const routes = [
    { name: 'home', path: '/home', meta: { title: 'Home' }, components: { default: { __file: 'src/pages/home.vue' } } },
    { name: 'detail', path: '/detail/:id', components: { default: () => import('../src/App.vue') } },
    { name: 'not-found', path: '/:pathMatch(.*)*' },
  ]
  const router = {
    options: { history: { base: '/app', createHref: path => path } },
    currentRoute: { value: { path: '/home', fullPath: '/home', matched: [routes[0]] } },
    getRoutes: () => routes,
    resolve: to => {
      const location = typeof to === 'string' ? to : to.path
      const path = location.split('?', 1)[0].replace(/\/\d+$/, '/:id')
      const matched = routes.filter(route => route.path === path)
      return { path, fullPath: location, matched: matched.length ? matched : [routes[2]] }
    },
    push: () => Promise.resolve(),
    replace: () => Promise.resolve(),
    afterEach: callback => { router.afterEachCallback = callback; return () => {} },
  }
  const container = window.document.createElement('div')
  container.id = '__nuxt'
  container.__vue_app__ = { config: { globalProperties: { $router: router } } }
  window.document.body.append(container)

  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { findVueRouterAdapter } = await server.ssrLoadModule('/src/runtime/adapters/vue-router.ts')
    const adapter = findVueRouterAdapter()
    assert(adapter)
    assert.equal(adapter.name, 'vue-router')
    assert.deepEqual(adapter.routes().map(route => [route.path, route.title]), [['/home', 'Home'], ['/detail/:id', 'detail'], ['/:pathMatch(.*)*', 'not-found']])
    assert.equal(adapter.currentPath(), '/home')
    assert.deepEqual(adapter.resolve('/detail/7?from=home'), { path: '/detail/:id', location: '/detail/7?from=home' })
    assert.equal(adapter.resolve('/.well_known'), undefined)
    assert.deepEqual(adapter.resolveAnchor(new URL('http://localhost/app/detail/8?q=1')), { path: '/detail/:id', location: '/detail/8?q=1' })

    const navigations = []
    adapter.interceptNavigation((navigation, method) => navigations.push({ navigation, method }))
    await router.push('/detail/9')
    assert.deepEqual(navigations, [{ navigation: { path: '/detail/:id', location: '/detail/9' }, method: 'push' }])
  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})
