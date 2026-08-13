import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import test from 'node:test'
import { resolve } from 'node:path'
import { createServer } from 'vite'

test('persists edited group and page names and refreshes the virtual client config', async () => {
  const root = await mkdtemp(resolve(os.tmpdir(), 'pageflow-group-names-'))
  await writeFile(resolve(root, '.pageflow'), JSON.stringify({
    enabled: true,
    previewPath: '/__unplugin-pageflow/',
    groupNames: {},
  }))
  const server = await createServer({
    root,
    configFile: resolve('vite.config.ts'),
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  })
  try {
    await server.listen()
    const address = server.httpServer?.address()
    assert(address && typeof address === 'object')
    const origin = `http://127.0.0.1:${address.port}`
    const configUrl = `${origin}/@id/virtual:unplugin-pageflow/config`
    assert.doesNotMatch(await (await fetch(configUrl)).text(), /业务流程/)
    const save = await fetch(`${origin}/__unplugin-pageflow/api/group-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'business', name: '业务流程' }),
    })
    const saveLayout = await fetch(`${origin}/__unplugin-pageflow/api/canvas-layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: '/business', positions: { overview: [120, 240] } }),
    })
    const savePageName = await fetch(`${origin}/__unplugin-pageflow/api/page-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: '/screen/legacy/yuye', name: '渔业演示' }),
    })
    const refreshedConfig = await (await fetch(configUrl)).text()
    const stored = JSON.parse(await readFile(resolve(root, '.pageflow'), 'utf8'))
    assert.equal(save.status, 200)
    assert.equal(saveLayout.status, 200)
    assert.equal(savePageName.status, 200)
    assert.match(refreshedConfig, /业务流程/)
    assert.match(refreshedConfig, /overview/)
    assert.match(refreshedConfig, /渔业演示/)
    assert.equal(stored.groupNames.business, '业务流程')
    assert.equal(stored.pageNames['/screen/legacy/yuye'], '渔业演示')
    assert.deepEqual(stored.canvasLayouts['/business'].overview, [120, 240])
    await writeFile(resolve(root, '.pageflow'), JSON.stringify({
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      groupNames: { refreshed: '重新读取' },
      canvasLayouts: { '/': { home: [320, 180] } },
    }))
    const refreshResponse = await fetch(`${origin}/__unplugin-pageflow/api/config`, { method: 'POST' })
    const refreshed = await refreshResponse.json()
    assert.equal(refreshResponse.status, 200)
    assert.equal(refreshed.loaded, true)
    assert.equal(refreshed.source, resolve(root, '.pageflow'))
    assert.equal(refreshed.groupNames.refreshed, '重新读取')
    assert.deepEqual(refreshed.canvasLayouts['/'].home, [320, 180])
  } finally {
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
})

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
    const clientVersion = await (await fetch(`${origin}/__unplugin-pageflow/api/client-version`)).text()
    const clientPath = html.match(/src="([^"]*virtual:unplugin-pageflow\/client[^"]*)"/)?.[1]
    assert(clientPath)
    const client = await fetch(`${origin}${clientPath}`)
    const clientCode = await client.text()
    const runtime = await fetch(`${origin}/@id/virtual:unplugin-pageflow/runtime`)
    const runtimeCode = await runtime.text()
    const runtimeClient = await fetch(`${origin}/src/runtime/client.ts`)
    const runtimeClientCode = await runtimeClient.text()
    const componentFile = resolve('tests/fixtures/Programmatic.vue').replaceAll('\\', '/')
    const redirectComponentFile = resolve('tests/fixtures/RedirectPage.vue').replaceAll('\\', '/')
    const routes = [
      { id: 'home', name: 'home', path: '/', title: 'Home', componentFile },
      { id: 'about', name: 'about', path: '/about', title: 'About' },
      { id: 'about-alias', name: 'about-alias', path: '/about', title: 'About alias' },
      { id: 'contact', name: 'contact', path: '/contact', title: 'Contact' },
      { id: 'user', name: 'user', path: '/users/:id', title: 'User' },
      { id: 'inferred', name: 'inferred', path: '/inferred', title: 'Inferred' },
      { id: 'source-check', name: 'source-check', path: '/source-check', title: 'Source check', componentFile: 'C:/project/src/source-check.vue' },
      { id: 'redirect-home', path: '/redirect-home', title: 'Redirect home', componentFile: redirectComponentFile },
      { id: 'standard-redirect', path: '/start', title: 'Start', redirect: '/about' },
      { id: '/[...all]', path: '/:all(.*)', title: 'Not found', catchAll: true },
    ]

    const routeUpdate = await fetch(`${origin}/__unplugin-pageflow/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeMode: 'hash', routes }),
    })
    const pageflowPlugin = server.config.plugins.find(plugin => plugin.name === 'unplugin-pageflow')
    assert.equal(typeof pageflowPlugin?.transform, 'function')
    const configCode = await pageflowPlugin.load('\0virtual:unplugin-pageflow/config')
    assert.match(configCode, /"launcher":true/)
    const distPattern = `${resolve('dist').replaceAll('\\', '/')}/**`
    assert(server.config.server.watch.ignored.includes(distPattern))
    assert(server.config.server.watch.ignored.includes('**/.unplugin-pageflow/cache/**'))
    assert.deepEqual(await pageflowPlugin.handleHotUpdate?.({ file: resolve('dist/client/mount.js') }), [])
    assert.deepEqual(await pageflowPlugin.handleHotUpdate?.({ file: resolve('.unplugin-pageflow/cache/thumbnail.webp') }), [])
    await pageflowPlugin.transform(await readFile(componentFile, 'utf8'), componentFile)
    await pageflowPlugin.transform(await readFile(redirectComponentFile, 'utf8'), redirectComponentFile)
    await pageflowPlugin.transform('export default {}', `${componentFile}?vue&type=template`)
    await pageflowPlugin.transform("uni.navigateTo({ url: '/contact' })", 'C:/project/src/inferred.vue')
    await pageflowPlugin.transform('export default {}', 'C:/project/src/inferred.vue?vue&type=script')
    await pageflowPlugin.transform(`<template>
      <button @click="uni.navigateTo({ url: '/missing' })">Missing</button>
      <navigator url="/about" @click="uni.navigateTo({ url: '/about' })">Duplicate</navigator>
      <button @click="uni.switchTab({ url: '/contact' })">Wrong method</button>
    </template>`, 'C:/project/src/source-check.vue')
    const staticGraph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()
    const missingAIContext = await fetch(`${origin}/__unplugin-pageflow/api/ai-context?path=${encodeURIComponent('/')}`)
    const publishAIContext = await fetch(`${origin}/__unplugin-pageflow/api/ai-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schemaVersion: 1, page: { title: 'Home', path: '/' }, diagnostics: [] }),
    })
    const aiContextResponse = await fetch(`${origin}/__unplugin-pageflow/api/ai-context?path=${encodeURIComponent('/')}`)
    const aiContext = await aiContextResponse.json()
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
    const publicConfigResponse = await fetch(`${origin}/.well-known/pageflow.json`)
    const publicConfig = await publicConfigResponse.json()
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
    assert.doesNotMatch(appHtml, /pageflow-config/)
    assert.equal(pageflow.status, 200)
    assert.match(html, /<title>unplugin-pageflow<\/title>/)
    assert.match(clientPath, /^\/@id\/virtual:unplugin-pageflow\/client\?v=\d+(?:\.\d+)?$/)
    assert.equal(new URL(clientPath, origin).searchParams.get('v'), clientVersion)
    assert.doesNotMatch(html, /@vite\/client/)
    assert.equal(client.status, 200)
    assert.match(clientCode, /mountPageFlow/)
    assert.match(clientCode, /mount\.js\?v=\d+(?:\.\d+)?/)
    assert.equal(runtime.status, 200)
    assert.match(runtimeCode, /startPageFlowRuntime/)
    assert.equal(runtimeClient.status, 200)
    assert.match(runtimeClientCode, /collectLinks/)
    assert.equal(routeUpdate.status, 204)
    assert.equal(missingAIContext.status, 404)
    assert.equal(publishAIContext.status, 204)
    assert.equal(aiContextResponse.headers.get('cache-control'), 'no-store')
    assert.equal(aiContext.page.path, '/')
    assert.equal(pageUpdate.status, 204)
    assert.match(pageEvent, /event: unplugin-pageflow:page-update/)
    assert.match(pageEvent, /About us/)
    assert.equal(graphResponse.status, 200)
    assert.equal(publicConfigResponse.status, 200)
    assert.deepEqual(publicConfig.graph.pages, graph.pages.map(({ id, title, path }) => ({ id, title, path })))
    assert.equal('testCommands' in publicConfig, false)
    assert.equal(publicConfig.graph.pages.some(page => 'sourceFile' in page), false)
    assert.equal(graph.routeMode, 'hash')
    assert.equal(graph.pages.filter(page => page.path === '/about').length, 1)
    assert.equal(graph.pages[0].title, 'Rendered home later')
    assert.equal(graph.pages[0].sourceFile, 'tests/fixtures/Programmatic.vue')
    assert.equal(staticGraph.pages.find(page => page.id === 'source-check').sourceFile, undefined)
    assert(graph.pages[0].links.some(link => link.label === 'About us'))
    assert.deepEqual(staticGraph.pages[0].links, [
      { label: 'navigateTo /about', to: 'about' },
      { label: 'redirectTo /users/42', to: 'user' },
      { label: 'replace /contact', to: 'contact' },
    ])
    const sourceRules = staticGraph.pages.find(page => page.id === 'source-check').diagnostics.map(item => item.ruleId)
    assert.deepEqual(sourceRules, [
      'event-navigation',
      'event-navigation',
      'duplicate-navigation',
      'event-navigation',
      'invalid-navigation-target',
      'navigation-method-mismatch',
    ])
    assert(graph.version >= 3)
    assert.equal(unchangedGraph.routeMode, graph.routeMode)
    assert.deepEqual(unchangedGraph.pages, graph.pages)
    assert.deepEqual(graph.pages.map(page => page.path), ['/', '/about', '/contact', '/users/:id', '/inferred', '/source-check'])
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

test('serves tests associated with the requested page', async () => {
  const root = resolve('tests/fixtures/page-tests')
  const server = await createServer({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  })

  await server.listen()
  try {
    const address = server.httpServer?.address()
    assert(address && typeof address === 'object')
    const origin = `http://127.0.0.1:${address.port}`
    const componentFile = resolve(root, 'src/pages/login.tsx').replaceAll('\\', '/')
    const routeUpdate = await fetch(`${origin}/__unplugin-pageflow/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeMode: 'history',
        routes: [
          { id: 'login', path: '/login', title: 'Login', componentFile },
          { id: 'profile', path: '/profile', title: 'Profile' },
        ],
      }),
    })
    const testsResponse = await fetch(`${origin}/__unplugin-pageflow/api/tests?path=${encodeURIComponent('/login')}`)
    const pageTests = await testsResponse.json()

    assert.equal(routeUpdate.status, 204)
    assert.equal(testsResponse.status, 200)
    assert.deepEqual(pageTests.map(item => item.name).sort(), [
      'returns to login',
      'shows invalid credentials',
      'submits valid credentials',
    ])
    const runnable = pageTests.find(item => item.name === 'returns to login')
    assert.equal(runnable.runnable, true)
    const runResponse = await fetch(`${origin}/__unplugin-pageflow/api/tests/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/login', id: runnable.id }),
    })
    const result = await runResponse.json()
    const refreshedTests = await (await fetch(`${origin}/__unplugin-pageflow/api/tests?path=${encodeURIComponent('/login')}`)).json()
    assert.equal(runResponse.status, 200)
    assert.equal(result.status, 'passed')
    assert.match(result.output, /测试通过/)
    assert.match(result.output, /pageflow test ok/)
    assert.doesNotMatch(result.output, /\u001B\[/)
    assert.equal(refreshedTests.find(item => item.id === runnable.id).status, 'passed')

    const profileTests = await (await fetch(`${origin}/__unplugin-pageflow/api/tests?path=${encodeURIComponent('/profile')}`)).json()
    const profileTest = profileTests.find(item => item.name === 'opens the profile page')
    const runningRequest = fetch(`${origin}/__unplugin-pageflow/api/tests/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/profile', id: profileTest.id }),
    })
    await new Promise(resolveDelay => setTimeout(resolveDelay, 100))
    const cancelResponse = await fetch(`${origin}/__unplugin-pageflow/api/tests/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: profileTest.id }),
    })
    const cancelledResult = await (await runningRequest).json()
    assert.equal(cancelResponse.status, 202)
    assert.equal(cancelledResult.status, 'skipped')
    assert.match(cancelledResult.output, /cancelled this test/)
  } finally {
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
    const clientConfig = await (await fetch(`${origin}/@id/virtual:unplugin-pageflow/config`)).text()
    const initialGraph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()
    assert.equal(initialGraph.routeMode, 'hash')
    await plugin.transform('<template><navigator url="/pages/login">Login</navigator></template>', resolve('tests/fixtures/uniapp/src/pages/index.vue'))
    await plugin.transform("uni.switchTab({ url: '/pages/index' })", 'src/menu.vue')
    const graph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()

    assert.equal(response.status, 204)
    assert.match(clientConfig, /"framework":"uni-app"/)
    assert.deepEqual(graph.pages.map(page => page.path), ['/', '/pages/login', '/pages/untitled', '/pages/product/index', '/menu'])
    assert.equal(graph.pages.find(page => page.id === 'root').title, 'Fixture home')
    assert.notEqual(graph.pages.find(page => page.id === 'root').revision, '/')
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
