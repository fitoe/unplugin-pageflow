import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import { createServer } from 'vite'

test('Vue 热更新直接推送对应页面', async () => {
  const server = await createServer({
    root: process.cwd(),
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  })
  const controller = new AbortController()
  try {
    await server.listen()
    const address = server.httpServer?.address()
    assert.ok(address && typeof address === 'object')
    const origin = `http://127.0.0.1:${address.port}`
    const componentFile = '/tests/fixtures/Programmatic.vue'
    await fetch(`${origin}/__unplugin-pageflow/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeMode: 'history',
        routes: [{ id: 'hot', path: '/hot', title: 'Hot', componentFile }],
      }),
    })
    const events = await fetch(`${origin}/__unplugin-pageflow/api/events`, { signal: controller.signal })
    const reader = events.body.getReader()
    const decoder = new TextDecoder()
    assert.match(decoder.decode((await reader.read()).value), /connected/)

    const plugin = server.config.plugins.find(item => item.name === 'unplugin-pageflow')
    await plugin.handleHotUpdate({ file: resolve('tests/fixtures/Programmatic.vue') })
    let update = ''
    const timeout = AbortSignal.timeout(5_000)
    const deadline = new Promise((_, reject) => timeout.addEventListener('abort', () => reject(timeout.reason), { once: true }))
    while (!update.includes('event: unplugin-pageflow:page-update')) {
      const chunk = await Promise.race([reader.read(), deadline])
      assert.equal(chunk.done, false)
      update += decoder.decode(chunk.value, { stream: true })
    }
    assert.match(update, /event: unplugin-pageflow:page-update/)
    assert.match(update, /"path":"\/hot"/)
  } finally {
    controller.abort()
    await server.close()
  }
})
