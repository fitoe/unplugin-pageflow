import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { resolve } from 'node:path'
import { createServer } from 'vite'

test('serves the unplugin-pageflow client from the configured development route', async () => {
  const server = await createServer({
    root: process.cwd(),
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  })

  await server.listen()
  const eventController = new AbortController()

  try {
    const address = server.httpServer?.address()
    assert(address && typeof address === 'object')
    const origin = `http://127.0.0.1:${address.port}`

    const app = await fetch(`${origin}/`)
    const appHtml = await app.text()
    const runtimeProxy = await fetch(`${origin}/index.html?html-proxy&index=0.js`)
    const runtimeProxyCode = await runtimeProxy.text()
    const pageflow = await fetch(`${origin}/__unplugin-pageflow/`)
    const html = await pageflow.text()
    const client = await fetch(`${origin}/@id/virtual:unplugin-pageflow/client`)
    const clientCode = await client.text()
    const runtime = await fetch(`${origin}/@id/virtual:unplugin-pageflow/runtime`)
    const runtimeCode = await runtime.text()
    const runtimeClient = await fetch(`${origin}/src/runtime/client.ts`)
    const runtimeClientCode = await runtimeClient.text()
    const componentFile = resolve('tests/fixtures/Programmatic.vue').replaceAll('\\', '/')
    const routes = [
      { id: 'home', name: 'home', path: '/', title: 'Home', componentFile },
      { id: 'about', name: 'about', path: '/about', title: 'About' },
      { id: 'about-alias', name: 'about-alias', path: '/about', title: 'About alias' },
      { id: 'contact', name: 'contact', path: '/contact', title: 'Contact' },
      { id: 'user', name: 'user', path: '/users/:id', title: 'User' },
      { id: 'inferred', name: 'inferred', path: '/inferred', title: 'Inferred' },
    ]

    const routeUpdate = await fetch(`${origin}/__unplugin-pageflow/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeMode: 'hash', routes }),
    })
    const pageflowPlugin = server.config.plugins.find(plugin => plugin.name === 'unplugin-pageflow')
    assert.equal(typeof pageflowPlugin?.transform, 'function')
    assert(server.config.server.watch.ignored.some(pattern => String(pattern).includes('/PageFlow/dist/**')))
    assert(server.config.server.watch.ignored.includes('**/.unplugin-pageflow/cache/**'))
    assert.deepEqual(await pageflowPlugin.handleHotUpdate?.({ file: resolve('dist/client/mount.js') }), [])
    assert.deepEqual(await pageflowPlugin.handleHotUpdate?.({ file: resolve('.unplugin-pageflow/cache/thumbnail.webp') }), [])
    await pageflowPlugin.transform(await readFile(componentFile, 'utf8'), componentFile)
    await pageflowPlugin.transform('export default {}', `${componentFile}?vue&type=template`)
    await pageflowPlugin.transform("uni.navigateTo({ url: '/contact' })", 'C:/project/src/inferred.vue')
    await pageflowPlugin.transform('export default {}', 'C:/project/src/inferred.vue?vue&type=script')
    const staticGraph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()
    const eventResponse = await fetch(`${origin}/__unplugin-pageflow/api/events`, { signal: eventController.signal })
    const eventReader = eventResponse.body.getReader()
    const eventDecoder = new TextDecoder()
    assert.match(eventDecoder.decode((await eventReader.read()).value), /connected/)
    const pageUpdate = await fetch(`${origin}/__unplugin-pageflow/api/page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/',
        title: 'Rendered home',
        links: [
          { label: 'About us', to: '/about', hotspot: { centerX: 0.2, centerY: 0.3 } },
          { label: 'About again', to: '/about', hotspot: { centerX: 0.7, centerY: 0.8 } },
        ],
      }),
    })
    await fetch(`${origin}/__unplugin-pageflow/api/page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/', title: 'Rendered home later' }),
    })
    const pageEvent = eventDecoder.decode((await eventReader.read()).value)
    const graphResponse = await fetch(`${origin}/__unplugin-pageflow/api/graph`)
    const graph = await graphResponse.json()
    await fetch(`${origin}/__unplugin-pageflow/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeMode: 'hash', routes }),
    })
    const unchangedGraph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()

    assert.equal(app.status, 200)
    assert.match(appHtml, /html-proxy&index=0\.js/)
    assert(appHtml.indexOf('html-proxy&index=0.js') < appHtml.indexOf('/src/main.ts'))
    assert.match(runtimeProxyCode, /virtual:unplugin-pageflow\/runtime/)
    assert.equal(pageflow.status, 200)
    assert.match(html, /<title>unplugin-pageflow<\/title>/)
    assert.match(html, /src="\/@id\/virtual:unplugin-pageflow\/client"/)
    assert.doesNotMatch(html, /@vite\/client/)
    assert.equal(client.status, 200)
    assert.match(clientCode, /mountPageFlow/)
    assert.equal(runtime.status, 200)
    assert.match(runtimeCode, /startPageFlowRuntime/)
    assert.equal(runtimeClient.status, 200)
    assert.match(runtimeClientCode, /collectLinks/)
    assert.equal(routeUpdate.status, 204)
    assert.equal(pageUpdate.status, 204)
    assert.match(pageEvent, /event: unplugin-pageflow:page-update/)
    assert.match(pageEvent, /About us/)
    assert.equal(graphResponse.status, 200)
    assert.equal(graph.routeMode, 'hash')
    assert.equal(graph.pages.filter(page => page.path === '/about').length, 1)
    assert.equal(graph.pages[0].title, 'Rendered home later')
    assert(graph.pages[0].links.some(link => link.label === 'About us'))
    assert.deepEqual(staticGraph.pages[0].links, [
      { label: 'navigateTo /about', to: 'about' },
      { label: 'redirectTo /users/42', to: 'user' },
      { label: 'replace /contact', to: 'contact' },
    ])
    assert(graph.version >= 3)
    assert.equal(unchangedGraph.version, graph.version)
    assert.deepEqual(graph.pages.map(page => page.path), ['/', '/about', '/contact', '/users/:id', '/inferred'])
    assert.deepEqual(graph.pages.find(page => page.path === '/inferred').links, [
      { label: 'navigateTo /contact', to: 'contact' },
    ])
    assert.deepEqual(graph.pages[0].links, [
      { label: 'navigateTo /about', to: 'about' },
      { label: 'redirectTo /users/42', to: 'user' },
      { label: 'replace /contact', to: 'contact' },
      { label: 'About us', to: 'about', hotspot: { centerX: 0.2, centerY: 0.3 } },
      { label: 'About again', to: 'about', hotspot: { centerX: 0.7, centerY: 0.8 } },
    ])
  } finally {
    eventController.abort()
    await server.close()
  }
})

test('collapses the configured uni-app home into the root route', async () => {
  const server = await createServer({
    root: resolve('tests/fixtures/uniapp'),
    configFile: resolve('vite.config.ts'),
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  })

  await server.listen()
  try {
    const address = server.httpServer?.address()
    assert(address && typeof address === 'object')
    const origin = `http://127.0.0.1:${address.port}`
    const response = await fetch(`${origin}/__unplugin-pageflow/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeMode: 'hash',
        routes: [
          { id: 'root', path: '/', title: 'Root' },
          { id: 'uni-home', path: '/pages/index', title: 'Uni home' },
          { id: 'login', path: '/pages/login', title: 'Login' },
          { id: 'untitled', path: '/pages/untitled', title: '/pages/untitled' },
          { id: 'product', path: '/pages/product/index', title: 'Product' },
          { id: 'menu', path: '/menu', title: 'Menu', componentFile: 'src/menu.vue' },
        ],
      }),
    })
    const plugin = server.config.plugins.find(item => item.name === 'unplugin-pageflow')
    await plugin.transform("uni.switchTab({ url: '/pages/index' })", 'src/menu.vue')
    const graph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()

    assert.equal(response.status, 204)
    assert.deepEqual(graph.pages.map(page => page.path), ['/', '/pages/login', '/pages/untitled', '/pages/product/index', '/menu'])
    assert.equal(graph.pages.find(page => page.id === 'root').title, 'Fixture home')
    assert.equal(graph.pages.find(page => page.id === 'login').title, 'Fixture login')
    assert.equal(graph.pages.find(page => page.id === 'product').title, 'Fixture product')
    assert.equal(graph.pages.find(page => page.id === 'untitled').title, '')
    assert.deepEqual(graph.pages.filter(page => page.routeOrder != null).map(page => [page.path, page.routeOrder]), [
      ['/', 0],
      ['/pages/login', 1],
      ['/pages/untitled', 2],
      ['/pages/product/index', 3],
    ])
    assert.deepEqual(graph.pages.find(page => page.id === 'menu').links, [
      { label: 'switchTab /pages/index', to: 'root' },
    ])
  } finally {
    await server.close()
  }
})
