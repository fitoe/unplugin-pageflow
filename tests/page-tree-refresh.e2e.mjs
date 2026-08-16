import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

test('clicking a removed page refreshes a stale page tree', { timeout: 30_000 }, async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../playground/basic/vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'silent',
  })
  let browser
  try {
    await server.listen()
    const origin = server.resolvedUrls.local[0].replace(/\/$/, '')
    browser = await chromium.launch({ headless: true })
    const warmup = await browser.newPage()
    await warmup.goto(origin, { waitUntil: 'networkidle' })
    for (let attempt = 0; attempt < 50; attempt++) {
      const graph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()
      if (graph.pages.length) break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    await warmup.close()
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      window.EventSource = class {
        addEventListener() {}
        close() {}
      }
    })
    await page.goto(`${origin}/__unplugin-pageflow/`, { waitUntil: 'networkidle' })
    const staleCheckout = page.locator('.page-tree-row.is-page', { hasText: '/checkout' })
    await staleCheckout.waitFor()

    const currentGraph = await (await fetch(`${origin}/__unplugin-pageflow/api/graph`)).json()
    const response = await fetch(`${origin}/__unplugin-pageflow/api/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeMode: currentGraph.routeMode,
        routes: currentGraph.pages.filter(item => item.id !== 'checkout').map(item => ({
          id: item.id,
          path: item.path,
          title: item.title,
          componentFile: item.sourceFile,
        })),
      }),
    })
    assert.equal(response.status, 204)
    assert.equal(await staleCheckout.count(), 1)

    await staleCheckout.click()
    await page.getByText('页面已失效，页面树已更新').waitFor()
    assert.equal(await staleCheckout.count(), 0)
    assert.doesNotMatch(page.url(), /%2Fcheckout/)
    assert.deepEqual(errors, [])
  } finally {
    await browser?.close()
    await server.close()
  }
})
