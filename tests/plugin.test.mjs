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
      { id: 'contact', name: 'contact', path: '/contact', title: 'Contact' },
      { id: 'user', name: 'user', path: '/users/:id', title: 'User' },
    ]

    const routeUpdate = await fetch(`${origin}/__unplugin-pageflow/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    })
    const pageflowPlugin = server.config.plugins.find(plugin => plugin.name === 'unplugin-pageflow')
    assert.equal(typeof pageflowPlugin?.transform, 'function')
    await pageflowPlugin.transform(await readFile(componentFile, 'utf8'), componentFile)
    const staticGraph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()
    const pageUpdate = await fetch(`${origin}/__unplugin-pageflow/api/page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/', links: [{ label: 'About us', to: '/about' }] }),
    })
    const graphResponse = await fetch(`${origin}/__unplugin-pageflow/api/graph`)
    const graph = await graphResponse.json()
    await fetch(`${origin}/__unplugin-pageflow/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    })
    const unchangedGraph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()

    assert.equal(app.status, 200)
    assert.match(appHtml, /html-proxy&index=0\.js/)
    assert.match(runtimeProxyCode, /virtual:unplugin-pageflow\/runtime/)
    assert.equal(pageflow.status, 200)
    assert.match(html, /<title>unplugin-pageflow<\/title>/)
    assert.equal(client.status, 200)
    assert.match(clientCode, /mountPageFlow/)
    assert.equal(runtime.status, 200)
    assert.match(runtimeCode, /startPageFlowRuntime/)
    assert.equal(runtimeClient.status, 200)
    assert.match(runtimeClientCode, /collectLinks/)
    assert.equal(routeUpdate.status, 204)
    assert.equal(pageUpdate.status, 204)
    assert.equal(graphResponse.status, 200)
    assert.deepEqual(staticGraph.pages[0].links, [
      { label: 'push /about', to: 'about' },
      { label: 'push /users/42', to: 'user' },
      { label: 'replace /contact', to: 'contact' },
    ])
    assert.equal(graph.version, 3)
    assert.equal(unchangedGraph.version, 3)
    assert.deepEqual(graph.pages.map(page => page.path), ['/', '/about', '/contact', '/users/:id'])
    assert.deepEqual(graph.pages[0].links, [
      { label: 'About us', to: 'about' },
      { label: 'push /users/42', to: 'user' },
      { label: 'replace /contact', to: 'contact' },
    ])
  } finally {
    await server.close()
  }
})
