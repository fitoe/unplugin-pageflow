import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { chromium } from '@playwright/test'

function startFixtureServer() {
  const server = createServer((request, response) => {
    if (request.url?.startsWith('/api/orders')) {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ orders: [{ id: 1, name: 'PageFlow' }] }))
      return
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end('<!doctype html><html><head><title>PageFlow fixture</title></head><body><main><button id="route">Route</button><img id="missing-alt"></main></body></html>')
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}

function portOf(server) {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Fixture server has no TCP port')
  return address.port
}

async function extensionWorker(context) {
  return context.serviceWorkers()[0] ?? context.waitForEvent('serviceworker')
}

function chromiumExecutable() {
  const expected = chromium.executablePath()
  if (existsSync(expected)) return expected
  const cache = process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
    : path.join(os.homedir(), '.cache', 'ms-playwright')
  const executable = process.platform === 'win32' ? 'chrome-win64/chrome.exe' : 'chrome-linux/chrome'
  const fallback = existsSync(cache)
    ? readdirSync(cache).filter(name => name.startsWith('chromium-')).sort().reverse()
      .map(name => path.join(cache, name, executable)).find(existsSync)
    : undefined
  if (!fallback) throw new Error('Chrome for Testing is missing. Run: pnpm exec playwright install chromium')
  return fallback
}

test('Chrome extension captures the PageFlow runtime loop', { timeout: 30_000 }, async () => {
  const server = await startFixtureServer()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'pageflow-chrome-e2e-'))
  const extensionPath = path.resolve('packages/chrome-extension/.output/chrome-mv3')
  const manifest = JSON.parse(readFileSync(path.join(extensionPath, 'manifest.json'), 'utf8'))
  assert.equal(manifest.devtools_page, undefined)
  assert.equal(manifest.action.default_title, '打开 PageFlow')
  let context
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath: chromiumExecutable(),
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    })
    const page = await context.newPage()
    const origin = `http://127.0.0.1:${portOf(server)}`
    await page.goto(origin)
    await page.evaluate(async () => {
      history.pushState({}, '', '/orders')
      await Promise.all([fetch('/api/orders?page=1'), fetch('/api/orders?page=2')])
    })
    await page.waitForTimeout(300)

    const worker = await extensionWorker(context)
    const tab = await worker.evaluate(async origin => {
      const [tab] = await chrome.tabs.query({ url: `${origin}/*` })
      return { id: tab.id, windowId: tab.windowId }
    }, origin)
    await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'pageflow:scan' }), tab.id)
    await page.waitForTimeout(150)
    const state = await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'pageflow:get-state' }), tab.id)

    assert.equal(await page.evaluate(() => Boolean(window.__PAGEFLOW_CHROME_RUNTIME__)), true)
    assert.deepEqual(state.pages.map(item => new URL(item.url).pathname), ['/', '/orders'])
    assert.deepEqual(state.edges.map(item => [new URL(item.from).pathname, new URL(item.to).pathname]), [['/', '/orders']])
    assert.equal(state.requests.find(item => item.url.includes('/api/orders'))?.occurrences, 2)
    assert.equal(state.requests.find(item => item.url.includes('/api/orders'))?.body.orders[0].name, 'PageFlow')
    assert(state.diagnostics.some(item => item.ruleId === 'missing-alt'))

    await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'pageflow:highlight', selector: '#route' }), tab.id)
    await page.waitForSelector('[data-unplugin-pageflow-diagnostic-highlight]')

    const extensionId = new URL(worker.url()).host
    const dashboard = await context.newPage()
    await dashboard.goto(`chrome-extension://${extensionId}/panel.html?tabId=${tab.id}`)
    await dashboard.getByText('独立画板').waitFor()
    await page.waitForTimeout(1_800)
    const persisted = await worker.evaluate(async origin => (await chrome.storage.local.get(`pageflow:canvas:${origin}`))[`pageflow:canvas:${origin}`], origin)
    assert.equal(persisted.pages.length, 2, JSON.stringify(persisted.pages))
    assert(Object.values(persisted.snapshots).some(value => value.startsWith('data:image/png;base64,')))
  } finally {
    await context?.close()
    await rm(userDataDir, { recursive: true, force: true })
    await new Promise(resolve => server.close(resolve))
  }
})
