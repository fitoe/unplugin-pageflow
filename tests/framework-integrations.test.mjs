import assert from 'node:assert/strict'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { createServer } from 'vite'

test('plain Vite configuration exposes explicit routes to the runtime', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { default: PageFlow } = await server.ssrLoadModule('/src/plugin/index.ts')
    const plugin = PageFlow.vite({ framework: 'vite', routes: [{ id: 'home', path: '/', title: 'Home' }] })
    const id = await plugin.resolveId('virtual:unplugin-pageflow/config')
    const source = await plugin.load(id)
    assert.match(source, /"framework":"vite"/)
    assert.match(source, /"routes":\[\{"id":"home","path":"\/","title":"Home"\}\]/)
  } finally {
    await server.close()
  }
})

test('Astro integration injects the runtime and exposes resolved user routes', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { default: PageFlow } = await server.ssrLoadModule('/src/astro/index.ts')
    const integration = PageFlow()
    let vitePlugins = []
    let injected
    await integration.hooks['astro:config:setup']({
      command: 'dev',
      config: { root: pathToFileURL(`${resolve('tests/fixtures/astro')}/`), srcDir: pathToFileURL(`${resolve('tests/fixtures/astro/src')}/`) },
      updateConfig: config => { vitePlugins = config.vite.plugins },
      injectScript: (stage, content) => { injected = { stage, content } },
    })
    assert.equal(injected.stage, 'page')
    assert.match(injected.content, /virtual:unplugin-pageflow\/runtime/)

    await integration.hooks['astro:routes:resolved']({ routes: [
      { type: 'page', pathname: '/', entrypoint: 'src/pages/index.astro' },
      { type: 'page', pathname: '/about', entrypoint: 'src/pages/about.astro' },
      { type: 'page', pathname: '/404', entrypoint: 'astro-default-404.astro' },
      { type: 'endpoint', pathname: '/api/data', entrypoint: 'src/pages/api/data.ts' },
    ] })
    const routesPlugin = vitePlugins.find(plugin => plugin.name === 'unplugin-pageflow-astro-routes')
    const id = routesPlugin.resolveId('virtual:unplugin-pageflow/astro-routes')
    const source = routesPlugin.load(id)
    assert.match(source, /"path":"\/"/)
    assert.match(source, /"path":"\/about"/)
    assert.doesNotMatch(source, /astro-default|\/api\/data/)
  } finally {
    await server.close()
  }
})
