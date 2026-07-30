import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('discovers Vue Router routes and reports rendered navigation hotspots', async () => {
  const window = new Window({ url: 'http://localhost/?__unplugin-pageflow_preview=1' })
  const requests = []
  const parentMessages = []
  let resolvePreviewRequest
  window.fetch = () => new Promise(resolve => { resolvePreviewRequest = resolve })
  let originalUniNavigationCalls = 0
  window.uni = {
    navigateTo: () => { originalUniNavigationCalls++ },
  }
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
      const fullPath = typeof to === 'string' ? to : to.path
      const path = fullPath.split(/[?#]/, 1)[0]
      return { path, fullPath, matched: routes.filter(route => route.path === path) }
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

  const declaredButton = window.document.createElement('button')
  declaredButton.textContent = 'Declared action'
  declaredButton.getBoundingClientRect = () => ({ left: 20, top: 60, width: 120, height: 32 })
  declaredButton.__vueParentComponent = {
    vnode: { el: declaredButton, props: { onClick: () => window.uni.navigateTo({ url: '/about' }) } },
  }
  container.append(declaredButton)

  const helperButton = window.document.createElement('button')
  helperButton.textContent = 'Helper action'
  helperButton.getBoundingClientRect = () => ({ left: 20, top: 100, width: 120, height: 32 })
  const openRoute = url => window.uni.navigateTo({ url })
  helperButton.__vueParentComponent = {
    vnode: { el: helperButton, props: { onClick: () => openRoute('/about') } },
    setupState: { openRoute },
  }
  container.append(helperButton)

  const actionButton = window.document.createElement('button')
  actionButton.textContent = 'Local action'
  actionButton.getBoundingClientRect = () => ({ left: 20, top: 140, width: 120, height: 32 })
  actionButton.__vueParentComponent = {
    vnode: { el: actionButton, props: { onClick: () => undefined } },
  }
  container.append(actionButton)

  const emittedButton = window.document.createElement('button')
  emittedButton.textContent = 'Select role'
  emittedButton.getBoundingClientRect = () => ({ left: 20, top: 180, width: 120, height: 32 })
  const emit = () => undefined
  const selectRole = role => window.uni.navigateTo({ url: `/about?role=${role}` })
  emittedButton.__vueParentComponent = {
    vnode: { props: { onSelect: selectRole } },
    subTree: { el: emittedButton, props: { onClick: () => emit('select', 'farmer') } },
  }
  container.append(emittedButton)

  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const runtime = await server.ssrLoadModule('/src/runtime/client.ts')
    const graphClient = await server.ssrLoadModule('/src/client/graph.ts')
    const snapshotClient = await server.ssrLoadModule('/src/client/snapshot.ts')
    await runtime.startPageFlowRuntime({
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/',
      dynamicParams: {},
    })

    assert.equal(typeof window.__UNPLUGIN_PAGEFLOW_READY__, 'function')
    assert.equal(typeof window.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__, 'function')
    assert.equal(image.src, 'http://localhost/static/example.png')

    const previewFrame = window.document.createElement('iframe')
    window.document.body.append(previewFrame)
    previewFrame.contentDocument.body.textContent = 'Rendered preview'
    previewFrame.contentWindow.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__ = () => 0
    let previewSettled = false
    const previewReady = snapshotClient.waitForPreviewReady(previewFrame, 40, 2000).then(() => { previewSettled = true })
    previewFrame.contentWindow.dispatchEvent(new previewFrame.contentWindow.Event('unplugin-pageflow:ready'))
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(previewSettled, false)
    await previewReady
    assert.equal(previewSettled, true)

    const previewRequest = window.fetch('/slow-preview-data')
    assert.equal(window.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__(), 1)
    resolvePreviewRequest({ ok: true })
    await previewRequest
    assert.equal(window.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__(), 0)

    assert.equal(requests[0].url, '/__unplugin-pageflow/api/page')
    assert.deepEqual(JSON.parse(requests[0].init.body), {
      path: '/',
      title: '',
      links: [
        { label: 'About us', to: '/about', hotspot: { centerX: 0.068359375, centerY: 0.0546875 } },
        { label: 'Declared action', to: '/about', hotspot: { centerX: 0.078125, centerY: 0.09895833333333333 } },
        { label: 'Helper action', to: '/about', hotspot: { centerX: 0.078125, centerY: 0.15104166666666666 } },
        { label: 'Select role', to: '/about', hotspot: { centerX: 0.078125, centerY: 0.2552083333333333 } },
      ],
    })

    window.document.title = 'Rendered home'
    router.afterEachCallback()
    for (let attempt = 0; attempt < 20 && !requests.some(request =>
      request.url.endsWith('/api/page') && JSON.parse(request.init.body).title === 'Rendered home'); attempt++)
      await new Promise(resolve => setTimeout(resolve, 25))
    const titledPage = [...requests].reverse().find(request =>
      request.url.endsWith('/api/page') && JSON.parse(request.init.body).title === 'Rendered home')
    assert.equal(JSON.parse(titledPage.init.body).title, 'Rendered home')
    assert.equal(requests.some(request => request.url.endsWith('/api/routes')), false)
    assert(parentMessages.some(item => item.message.type === 'unplugin-pageflow:page-reported' && item.message.path === '/'))
    assert.equal(window.document.querySelectorAll('[data-unplugin-pageflow-hotspot]').length, 5)
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="link"]').style.background, 'rgba(255, 92, 168, 0.18)')
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="event"]').style.background, 'rgba(101, 191, 255, 0.18)')
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="link"]').dataset.unpluginPageflowTargets, '/about')
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="event"]').dataset.unpluginPageflowTargets, '')

    link.click()
    await new Promise(resolve => setTimeout(resolve, 20))
    assert(parentMessages.some(item => item.message.type === 'unplugin-pageflow:navigate'
      && item.message.to === '/about'
      && item.message.location === '/about'))

    const uniButton = window.document.createElement('button')
    uniButton.textContent = 'Open about with uni'
    uniButton.addEventListener('click', () => window.uni.navigateTo({ url: '/about?from=uni' }))
    container.append(uniButton)
    uniButton.click()
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(originalUniNavigationCalls, 0)
    assert(parentMessages.some(item => item.message.type === 'unplugin-pageflow:navigate'
      && item.message.to === '/about'
      && item.message.location === '/about?from=uni'))

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
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="event"]').style.background, 'rgba(101, 191, 255, 0.18)')
    assert.deepEqual(parentMessages.find(item => item.message.type === 'unplugin-pageflow:navigate' && item.message.to === '/about'), {
      message: { type: 'unplugin-pageflow:navigate', to: '/about', location: '/about' },
      origin: 'http://localhost',
    })
    const navigationCount = parentMessages.filter(item => item.message.type === 'unplugin-pageflow:navigate').length
    router.currentRoute.value = { path: '/about', matched: [routes[1]] }
    router.afterEachCallback()
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(parentMessages.filter(item => item.message.type === 'unplugin-pageflow:navigate').length, navigationCount)

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
      previewRoles: [{ match: '/about/**', role: 'editor' }],
    }, [{ id: 'about', title: 'About', path: '/about', accent: '#fff', links: [] }], 'hash')
    const scanFrame = window.document.querySelector('[data-unplugin-pageflow-link-discovery]')
    assert(scanFrame)
    assert.equal(scanFrame.hidden, false)
    assert.equal(scanFrame.style.width, '1280px')
    assert.equal(scanFrame.src, 'http://localhost/?__unplugin-pageflow_preview=1&__unplugin-pageflow_role=editor#/about')
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
