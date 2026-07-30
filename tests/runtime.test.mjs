import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('discovers Vue Router routes and reports rendered navigation hotspots', async () => {
  const window = new Window({ url: 'http://localhost/?__unplugin-pageflow_preview=1' })
  const requests = []
  const parentMessages = []
  Object.defineProperty(window, 'parent', {
    configurable: true,
    value: { postMessage: (message, origin) => parentMessages.push({ message, origin }) },
  })
  const routes = [
    { name: 'home', path: '/', meta: { title: 'Home' } },
    { name: 'about', path: '/about', meta: { title: 'About' } },
  ]
  const router = {
    options: { history: { base: '/app', createHref: path => `#${path}` } },
    currentRoute: { value: { path: '/', matched: [routes[0]] } },
    getRoutes: () => routes,
    resolve: to => {
      const path = typeof to === 'string' ? to : to.path
      return { path, matched: routes.filter(route => route.path === path) }
    },
    push: () => Promise.resolve(),
    replace: () => Promise.resolve(),
    afterEach: callback => {
      router.afterEachCallback = callback
      return () => {}
    },
  }

  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    MutationObserver: window.MutationObserver,
    requestAnimationFrame: callback => setTimeout(() => callback(0), 0),
    fetch: async (url, init) => {
      requests.push({ url: String(url), init })
      return { ok: true, status: 204 }
    },
  })

  const container = window.document.createElement('div')
  container.id = 'app'
  container.setAttribute('data-v-app', '')
  container.__vue_app__ = { config: { globalProperties: { $router: router } } }
  window.document.body.append(container)

  const link = window.document.createElement('a')
  link.href = '/app/about'
  link.textContent = 'About us'
  link.getBoundingClientRect = () => ({ left: 20, top: 30, width: 100, height: 24 })
  container.append(link)

  const image = window.document.createElement('img')
  image.src = './static/example.png'
  container.append(image)

  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const runtime = await server.ssrLoadModule('/src/runtime/client.ts')
    const graphClient = await server.ssrLoadModule('/src/client/graph.ts')
    await runtime.startPageFlowRuntime({
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/',
      dynamicParams: {},
    })

    assert.equal(typeof window.__UNPLUGIN_PAGEFLOW_READY__, 'function')
    assert.equal(image.src, 'http://localhost/static/example.png')

    assert.equal(requests[0].url, '/__unplugin-pageflow/api/page')
    assert.deepEqual(JSON.parse(requests[0].init.body), {
      path: '/',
      links: [{ label: 'About us', to: '/about' }],
    })
    assert.equal(requests.some(request => request.url.endsWith('/api/routes')), false)
    assert(parentMessages.some(item => item.message.type === 'unplugin-pageflow:page-reported' && item.message.path === '/'))
    assert.equal(window.document.querySelectorAll('[data-unplugin-pageflow-hotspot]').length, 1)

    const wheel = new window.WheelEvent('wheel', { cancelable: true, clientX: 40, clientY: 50, deltaY: 120 })
    window.dispatchEvent(wheel)
    assert.equal(wheel.defaultPrevented, true)
    assert(parentMessages.some(item => item.message.type === 'unplugin-pageflow:wheel'
      && item.message.deltaY === 120))

    const button = window.document.createElement('button')
    button.textContent = 'Open about'
    button.getBoundingClientRect = () => ({ left: 20, top: 80, width: 120, height: 32 })
    button.addEventListener('click', () => router.push('/about'))
    container.append(button)
    button.click()
    await new Promise(resolve => setTimeout(resolve, 20))

    const latestPage = [...requests].reverse().find(request => request.url.endsWith('/api/page'))
    assert(JSON.parse(latestPage.init.body).links.some(item => item.label === 'Open about' && item.to === '/about'))
    assert.deepEqual(parentMessages.find(item => item.message.type === 'unplugin-pageflow:navigate'), {
      message: { type: 'unplugin-pageflow:navigate', to: '/about' },
      origin: 'http://localhost',
    })

    window.history.replaceState({}, '', '/')
    requests.length = 0
    await runtime.startPageFlowRuntime({
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/',
      dynamicParams: {},
    })
    assert.equal(requests.length, 1)
    assert.equal(requests[0].url, '/__unplugin-pageflow/api/routes')
    assert.equal(JSON.parse(requests[0].init.body).routeMode, 'hash')
    assert.deepEqual(JSON.parse(requests[0].init.body).routes.map(route => route.path), ['/', '/about'])

    const scan = graphClient.scanPageLinks({
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/',
      dynamicParams: {},
    }, [{ id: 'about', title: 'About', path: '/about', accent: '#fff', links: [] }], 'hash')
    const scanFrame = window.document.querySelector('[data-unplugin-pageflow-link-discovery]')
    assert(scanFrame)
    assert.equal(scanFrame.hidden, false)
    assert.equal(scanFrame.style.width, '1280px')
    assert.equal(scanFrame.src, 'http://localhost/?__unplugin-pageflow_preview=1#/about')
    scanFrame.dispatchEvent(new window.Event('load'))
    window.dispatchEvent(new window.MessageEvent('message', {
      data: { type: 'unplugin-pageflow:page-reported', path: '/about' },
      origin: 'http://localhost',
    }))
    await scan
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-link-discovery]'), null)
  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})
