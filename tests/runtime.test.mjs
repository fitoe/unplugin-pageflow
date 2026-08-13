import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

async function waitFor(predicate, timeout = 10_000) {
  const startedAt = Date.now()
  while (!predicate()) {
    if (Date.now() - startedAt >= timeout) {
      await new Promise(resolve => setTimeout(resolve, 0))
      if (!predicate()) throw new Error(`Condition was not met within ${timeout}ms`)
      return
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

test('discovers Vue Router routes and reports rendered navigation hotspots', async () => {
  const window = new Window({ url: 'http://localhost/?__unplugin-pageflow_preview=1&__unplugin_pageflow_inspect=1' })
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
  link.href = '/app/about?from=hotspot'
  link.textContent = 'About us'
  link.getBoundingClientRect = () => ({ left: 20, top: 30, width: 100, height: 24 })
  container.append(link)

  const navigator = window.document.createElement('uni-navigator')
  navigator.getBoundingClientRect = () => ({ left: 20, top: 215, width: 100, height: 32 })
  navigator.__vueParentComponent = {
    vnode: { el: navigator, props: { onClick: () => undefined } },
  }
  const navigatorLink = window.document.createElement('a')
  navigatorLink.href = '/app/about'
  navigatorLink.textContent = 'Nested service'
  navigatorLink.getBoundingClientRect = navigator.getBoundingClientRect
  navigator.append(navigatorLink)
  container.append(navigator)

  const declaredTarget = window.document.createElement('button')
  declaredTarget.textContent = 'Declared target'
  declaredTarget.dataset.pageflowTo = '/about'
  declaredTarget.getBoundingClientRect = () => ({ left: 20, top: 55, width: 120, height: 28 })
  container.append(declaredTarget)

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
    let webglContextOptions
    const originalGetContext = window.HTMLCanvasElement.prototype.getContext
    window.HTMLCanvasElement.prototype.getContext = function (contextId, options) {
      if (contextId === 'webgl') {
        webglContextOptions = options
        return {}
      }
      return originalGetContext.call(this, contextId, options)
    }
    const runtime = await server.ssrLoadModule('/src/runtime/client.ts')
    const snapshotClient = await server.ssrLoadModule('/src/client/snapshot.ts')
    const nestedFrame = window.document.createElement('iframe')
    window.document.body.append(nestedFrame)
    nestedFrame.contentDocument.body.innerHTML = '<a href="/screen/legacy/yanzhengzhongxin">概念验证中心</a>'
    nestedFrame.getBoundingClientRect = () => ({ left: 200, top: 100, width: 400, height: 300 })
    Object.defineProperty(nestedFrame.contentWindow, 'innerWidth', { configurable: true, value: 400 })
    Object.defineProperty(nestedFrame.contentWindow, 'innerHeight', { configurable: true, value: 300 })
    nestedFrame.contentDocument.querySelector('a').getBoundingClientRect = () => ({ left: 100, top: 50, width: 200, height: 40 })
    await runtime.startPageFlowRuntime({
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/',
      dynamicParams: {},
    })

    const nestedLink = nestedFrame.contentDocument.querySelector('a')
    const nestedEvent = new nestedFrame.contentWindow.MouseEvent('click', { bubbles: true, cancelable: true })
    assert.equal(runtime.interceptNestedFrameLink(nestedLink, nestedEvent, nestedFrame, {
      resolveAnchor: target => ({ path: '/screen/legacy/:page', location: target.pathname }),
    }), true)
    assert.equal(nestedEvent.defaultPrevented, true)
    assert(parentMessages.some(item => item.message.type === 'unplugin-pageflow:navigate'
      && item.message.location === '/screen/legacy/yanzhengzhongxin'
      && item.message.interaction === 'hotspot'))

    assert.equal(typeof window.__UNPLUGIN_PAGEFLOW_READY__, 'function')
    assert.equal(typeof window.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__, 'function')
    const webglCanvas = window.document.createElement('canvas')
    webglCanvas.getContext('webgl', { alpha: false })
    assert.deepEqual(webglContextOptions, { alpha: false })
    assert.equal(webglCanvas.hasAttribute('data-unplugin-pageflow-webgl'), true)
    assert.equal(image.src, 'http://localhost/static/example.png')

    const coveringDialog = window.document.createElement('section')
    const originalElementFromPoint = window.document.elementFromPoint
    window.document.elementFromPoint = () => coveringDialog
    assert.equal(runtime.isElementExposed(link), false)
    window.document.elementFromPoint = () => link
    assert.equal(runtime.isElementExposed(link), true)
    window.document.elementFromPoint = originalElementFromPoint

    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }))
    await waitFor(() => parentMessages.some(item => item.message.type === 'unplugin-pageflow:escape'))
    const escapeMessageCount = parentMessages.filter(item => item.message.type === 'unplugin-pageflow:escape').length
    const handledEscape = new window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    handledEscape.preventDefault()
    window.dispatchEvent(handledEscape)
    await Promise.resolve()
    assert.equal(parentMessages.filter(item => item.message.type === 'unplugin-pageflow:escape').length, escapeMessageCount)

    const pageReportsBeforeScan = requests.filter(request => request.url.endsWith('/api/page')).length
    window.dispatchEvent(new window.MessageEvent('message', {
      data: { type: 'unplugin-pageflow:scan-page' },
      origin: 'http://localhost',
    }))
    await waitFor(() => parentMessages.some(item => item.message.type === 'unplugin-pageflow:scan-result'))
    assert.equal(requests.filter(request => request.url.endsWith('/api/page')).length, pageReportsBeforeScan)
    assert(parentMessages.some(item => item.message.type === 'unplugin-pageflow:scan-result'
      && item.message.page.path === '/'
      && item.message.page.links.some(link => link.label === 'Declared target' && link.to === '/about')))

    const previewFrame = window.document.createElement('iframe')
    window.document.body.append(previewFrame)
    previewFrame.contentDocument.body.textContent = 'Rendered preview'
    previewFrame.contentWindow.__UNPLUGIN_PAGEFLOW_PENDING_REQUESTS__ = () => 0
    let previewSettled = false
    const previewReady = snapshotClient.waitForPreviewReady(previewFrame, 40, 5000).then(() => { previewSettled = true })
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

    container.append(' Visible Name ')
    const visibleInput = window.document.createElement('input')
    visibleInput.value = 'X'
    container.append(visibleInput)
    const apiRequest = window.fetch('/api/profile')
    resolvePreviewRequest({
      status: 200,
      headers: { get: () => 'application/json' },
      clone: () => ({ json: async () => ({ name: 'Visible Name', secret: 'Hidden Value', code: 'X', items: Array.from({ length: 25 }, (_, id) => ({ id })) }) }),
    })
    await apiRequest
    await new Promise(resolve => setTimeout(resolve, 20))
    const apiResult = parentMessages.find(item => item.message.type === 'unplugin-pageflow:api-result')?.message.result
    assert.equal(apiResult.url, '/api/profile')
    assert.deepEqual(apiResult.fields.slice(0, 3).map(field => [field.path, field.used]), [
      ['name', true],
      ['secret', false],
      ['code', true],
    ])
    assert.equal(apiResult.fields.some(field => field.path === 'items[19].id'), true)
    assert.equal(apiResult.fields.some(field => field.path === 'items[20].id'), false)

    assert.equal(requests[0].url, '/__unplugin-pageflow/api/page')
    assert.deepEqual(JSON.parse(requests[0].init.body), {
      path: '/',
      title: '',
      links: [
        { label: 'About us', to: '/about', location: '/about?from=hotspot', kind: 'link', hotspot: { centerX: 0.068359375, centerY: 0.0546875 } },
        { label: 'Nested service', to: '/about', location: '/about', kind: 'link', hotspot: { centerX: 0.068359375, centerY: 0.30078125 } },
        { label: '概念验证中心', to: '/screen/legacy/yanzhengzhongxin', location: '/screen/legacy/yanzhengzhongxin', kind: 'link', hotspot: { centerX: 0.390625, centerY: 0.22135416666666666 } },
        { label: 'Declared target', to: '/about', location: '/about', kind: 'link', hotspot: { centerX: 0.078125, centerY: 0.08984375 } },
        { label: 'Declared action', to: '/about', kind: 'event', hotspot: { centerX: 0.078125, centerY: 0.09895833333333333 } },
        { label: 'Helper action', to: '/about', kind: 'event', hotspot: { centerX: 0.078125, centerY: 0.15104166666666666 } },
        { label: 'Select role', to: '/about', kind: 'event', hotspot: { centerX: 0.078125, centerY: 0.2552083333333333 } },
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
    assert.equal(window.document.querySelectorAll('[data-unplugin-pageflow-hotspot]').length, 8)
    const nestedHotspot = [...window.document.querySelectorAll('[data-unplugin-pageflow-hotspot="link"]')]
      .find(element => element.dataset.unpluginPageflowTargets === '/screen/legacy/yanzhengzhongxin')
    assert.equal(nestedHotspot.style.left, '300px')
    assert.equal(nestedHotspot.style.top, '150px')
    assert.equal([...window.document.querySelectorAll('[data-unplugin-pageflow-hotspot="event"]')]
      .some(element => element.style.top === '140px'), true)
    assert.equal([...window.document.querySelectorAll('[data-unplugin-pageflow-hotspot="event"]')]
      .some(element => element.style.top === '215px'), false)
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="link"]').style.background, 'rgba(255, 92, 168, 0.2)')
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="event"]').style.background, 'rgba(101, 191, 255, 0.2)')
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="link"]').style.opacity, '0.5')
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="link"]').dataset.unpluginPageflowTargets, '/about')
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="link"]').style.pointerEvents, 'auto')
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="event"]').dataset.unpluginPageflowTargets, '/about')

    link.click()
    await new Promise(resolve => setTimeout(resolve, 20))
    assert(parentMessages.some(item => item.message.type === 'unplugin-pageflow:navigate'
      && item.message.to === '/about'
      && item.message.location === '/about?from=hotspot'))
    const semanticHotspot = window.document.querySelector('[data-unplugin-pageflow-hotspot="link"]')
    assert.equal(semanticHotspot.tagName, 'A')
    assert.equal(semanticHotspot.getAttribute('href'), '/about?from=hotspot')

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

    const detachedNavigationCount = parentMessages.filter(item => item.message.type === 'unplugin-pageflow:navigate').length
    await window.uni.navigateTo({ url: '/about?from=login-success' })
    assert.equal(parentMessages.filter(item => item.message.type === 'unplugin-pageflow:navigate').length, detachedNavigationCount + 1)
    assert.deepEqual(parentMessages.findLast(item => item.message.type === 'unplugin-pageflow:navigate').message, {
      type: 'unplugin-pageflow:navigate',
      to: '/about',
      location: '/about?from=login-success',
    })

    const wheel = new window.WheelEvent('wheel', { cancelable: true, clientX: 40, clientY: 50, deltaY: 120 })
    window.dispatchEvent(wheel)
    assert.equal(wheel.defaultPrevented, false)
    assert.equal(parentMessages.some(item => item.message.type === 'unplugin-pageflow:wheel'), false)

    const button = window.document.createElement('button')
    button.textContent = 'Open about'
    button.getBoundingClientRect = () => ({ left: 20, top: 80, width: 120, height: 32 })
    button.addEventListener('click', () => router.push('/about'))
    container.append(button)
    button.click()
    await new Promise(resolve => setTimeout(resolve, 20))

    const latestPage = [...requests].reverse().find(request => request.url.endsWith('/api/page'))
    assert(JSON.parse(latestPage.init.body).links.some(item => item.label === 'Open about' && item.to === '/about'))
    assert.equal(window.document.querySelector('[data-unplugin-pageflow-hotspot="event"]').style.background, 'rgba(101, 191, 255, 0.2)')
    assert.deepEqual(parentMessages.findLast(item => item.message.type === 'unplugin-pageflow:navigate' && item.message.to === '/about'), {
      message: { type: 'unplugin-pageflow:navigate', to: '/about', location: '/about' },
      origin: 'http://localhost',
    })

    link.getBoundingClientRect = () => ({ left: 20, top: 900, right: 120, bottom: 924, width: 100, height: 24 })
    const scanCount = parentMessages.filter(item => item.message.type === 'unplugin-pageflow:scan-result').length
    window.document.dispatchEvent(new window.Event('scroll'))
    await waitFor(() => parentMessages.filter(item => item.message.type === 'unplugin-pageflow:scan-result').length > scanCount)
    const scrolledPage = parentMessages.findLast(item => item.message.type === 'unplugin-pageflow:scan-result').message.page
    assert.equal(scrolledPage.links.some(item => item.label === 'About us'), false)
    assert.equal([...window.document.querySelectorAll('[data-unplugin-pageflow-hotspot]')]
      .some(element => element.style.top === '900px'), false)

    const reportsBeforeLocalMutation = requests.filter(request => request.url.endsWith('/api/page')).length
    const scansBeforeLocalMutation = parentMessages.filter(item => item.message.type === 'unplugin-pageflow:scan-result').length
    const localDialog = window.document.createElement('section')
    localDialog.textContent = 'Local dialog state'
    container.append(localDialog)
    await waitFor(() => parentMessages.filter(item => item.message.type === 'unplugin-pageflow:scan-result').length > scansBeforeLocalMutation)
    assert.equal(requests.filter(request => request.url.endsWith('/api/page')).length, reportsBeforeLocalMutation)

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

  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})
