import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve } from 'node:path'
import { createServer } from 'vite'

test('maps Qwik City file routes and injects its client entry', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { resolveQwikCityRoutes, default: pageflowQwikCity } = await server.ssrLoadModule('/src/qwik-city/index.ts')
    const routes = resolveQwikCityRoutes(resolve('tests/fixtures/qwik-city'))
    assert.deepEqual(routes.map(route => route.path), ['/', '/about', '/docs/:slug*', '/products/:id'])
    assert.match(pageflowQwikCity()[0].transform('export {}', 'C:/project/src/entry.dev.tsx'), /virtual:unplugin-pageflow\/runtime/)
  } finally {
    await server.close()
  }
})

test('serves a real Qwik City SSR app and initializes the PageFlow graph', async () => {
  const server = await createServer({
    configFile: resolve('tests/fixtures/qwik-city/vite.config.ts'),
    mode: 'ssr',
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 24686, strictPort: true },
  })
  try {
    await server.listen()
    const html = await fetch('http://127.0.0.1:24686/').then(response => response.text())
    assert.match(html, /Qwik home/)
    assert.match(html, /\/about\?from=home/)
    const graph = await fetch('http://127.0.0.1:24686/__unplugin-pageflow/api/graph').then(response => response.json())
    assert.deepEqual(graph.pages.map(page => page.path), ['/', '/about', '/docs/:slug*', '/products/:id'])
  } finally {
    await server.close()
  }
})
