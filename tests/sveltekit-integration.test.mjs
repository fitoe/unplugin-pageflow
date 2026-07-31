import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve } from 'node:path'
import { createServer } from 'vite'

test('maps SvelteKit file routes, groups, dynamic and rest segments', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { resolveSvelteKitRoutes } = await server.ssrLoadModule('/src/sveltekit/index.ts')
    const routes = resolveSvelteKitRoutes(resolve('tests/fixtures/sveltekit'))
    assert.deepEqual(routes.map(route => route.path), ['/', '/about', '/products/:id'])
    const { default: PageFlow } = await server.ssrLoadModule('/src/sveltekit/index.ts')
    const injection = PageFlow()[0].transform('export const app = {}', 'C:/project/.svelte-kit/generated/client/app.js')
    assert.match(injection, /virtual:unplugin-pageflow\/runtime/)
  } finally {
    await server.close()
  }
})
