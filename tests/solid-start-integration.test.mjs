import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve } from 'node:path'
import { createServer } from 'vite'

test('maps SolidStart file routes and dynamic segments', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { resolveSolidStartRoutes } = await server.ssrLoadModule('/src/solid-start/index.ts')
    const routes = resolveSolidStartRoutes(resolve('tests/fixtures/solid-start'))
    assert.deepEqual(routes.map(route => route.path), ['/', '/about', '/products/:id'])
    const { default: PageFlow } = await server.ssrLoadModule('/src/solid-start/index.ts')
    assert.match(PageFlow()[0].transform('export {}', 'C:/project/src/entry-client.tsx'), /virtual:unplugin-pageflow\/runtime/)
  } finally {
    await server.close()
  }
})
