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
    response.end('<!doctype html><html><head><title>PageFlow fixture</title></head><body style="min-height:2000px"><main><button id="route">Route</button><a href="/about" style="position:absolute;top:1200px;left:20px;width:120px;height:40px">About</a><a href="/products/1?ref=first">Product 1</a><a href="/products/2?ref=second">Product 2</a><a href="/articles/first">First article</a><a href="/articles/second">Second article</a><img id="missing-alt"></main></body></html>')
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

test('Chrome extension captures the PageFlow runtime loop', { timeout: 90_000 }, async () => {
  const server = await startFixtureServer()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'pageflow-chrome-e2e-'))
  const extensionPath = path.resolve(process.env.PAGEFLOW_E2E_EXTENSION_DIR ?? 'packages/chrome-extension/.output/chrome-mv3')
  const manifest = JSON.parse(readFileSync(path.join(extensionPath, 'manifest.json'), 'utf8'))
  const enhanced = manifest.permissions.includes('debugger')
  assert.equal(manifest.devtools_page, undefined)
  assert.equal(manifest.action.default_title, '打开 PageFlow')
  assert.equal(manifest.permissions.includes('debugger'), enhanced)
  assert.equal(manifest.optional_permissions?.includes('debugger') ?? false, false)
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
    await page.waitForTimeout(100)
    await page.evaluate(async () => {
      history.pushState({}, '', '/products/2?ref=visited')
      await new Promise(resolve => setTimeout(resolve))
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
    await page.waitForTimeout(500)
    const state = await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'pageflow:get-state' }), tab.id)

    assert.equal(await page.evaluate(() => Boolean(window.__PAGEFLOW_CHROME_RUNTIME__)), true)
    assert.deepEqual(state.pages.map(item => new URL(item.url).pathname), ['/', '/about', '/products/2', '/articles/first', '/orders'])
    assert.deepEqual(state.edges.map(item => [new URL(item.from).pathname, new URL(item.to).pathname]), [['/', '/about'], ['/', '/products/:id'], ['/', '/articles/:id'], ['/products/:id', '/orders'], ['/orders', '/about'], ['/orders', '/products/:id'], ['/orders', '/articles/:id']])
    assert.equal(state.requests.find(item => item.url.includes('/api/orders'))?.occurrences, 2)
    assert.equal(state.requests.find(item => item.url.includes('/api/orders'))?.body.orders[0].name, 'PageFlow')
    assert(state.diagnostics.some(item => item.ruleId === 'missing-alt'))
    const aboutEdge = state.edges.find(item => new URL(item.from).pathname === '/orders' && new URL(item.to).pathname === '/about')
    assert.equal(aboutEdge.hotspot, undefined)
    await page.evaluate(() => scrollTo(0, 1000))
    await page.waitForTimeout(150)
    const scrolledState = await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'pageflow:get-state' }), tab.id)
    assert(scrolledState.edges.find(item => item.id === aboutEdge.id)?.hotspot)
    await page.evaluate(() => scrollTo(0, 0))
    await page.waitForTimeout(150)
    const restoredState = await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'pageflow:get-state' }), tab.id)
    assert.equal(restoredState.edges.find(item => item.id === aboutEdge.id)?.hotspot, undefined)

    await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'pageflow:highlight', selector: '#route' }), tab.id)
    await page.waitForSelector('[data-unplugin-pageflow-diagnostic-highlight]')

    const extensionId = new URL(worker.url()).host
    const dashboard = await context.newPage()
    await dashboard.setViewportSize({ width: 1_440, height: 900 })
    await dashboard.goto(`chrome-extension://${extensionId}/panel.html?tabId=${tab.id}`)
    await dashboard.getByText('unplugin-pageflow').waitFor()
    await dashboard.getByText('0 组 / 5 页').waitFor()
    const themeIcon = dashboard.locator('button[aria-label^="切换到"] [data-slot="leadingIcon"]')
    assert.equal(await themeIcon.count(), 1)
    assert.notEqual(await themeIcon.evaluate(element => getComputedStyle(element).maskImage), 'none')
    const canvasBounds = await dashboard.locator('.canvas').evaluate(element => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    })
    assert.deepEqual(canvasBounds, { width: 1_440, height: 826 })

    const viewportButtons = dashboard.locator('[aria-label="Preview viewport"] button')
    assert.equal(await viewportButtons.count(), 3)
    await viewportButtons.nth(0).click()
    await viewportButtons.nth(2).click()
    const initialDark = (await dashboard.locator('html').getAttribute('class'))?.includes('dark') ?? false
    await dashboard.locator('button[aria-label^="切换到"]').click()
    assert.notEqual((await dashboard.locator('html').getAttribute('class'))?.includes('dark') ?? false, initialDark)

    const search = dashboard.getByPlaceholder('搜索页面…')
    await search.fill('About')
    await dashboard.getByRole('option', { name: /About/ }).click()
    await dashboard.locator('iframe[src*="__unplugin-pageflow_preview=1"]').waitFor({ state: 'attached' })
    const detailTabs = dashboard.locator('[aria-label="页面详情"] button')
    await detailTabs.filter({ hasText: '诊断' }).click()
    await dashboard.getByRole('button', { name: '重新扫描页面' }).click()
    await detailTabs.filter({ hasText: '待办' }).click()
    await dashboard.getByRole('textbox', { name: '添加当前页面待办' }).fill('Chrome smoke todo')
    await dashboard.getByRole('button', { name: '添加' }).click()
    await dashboard.getByText('Chrome smoke todo').waitFor()
    await dashboard.keyboard.press('Escape')
    await dashboard.waitForTimeout(800)
    const aboutPreview = dashboard.locator('.page-preview:has(iframe[title="About preview"])')
    const aboutBefore = await aboutPreview.boundingBox()
    assert(aboutBefore)
    await dashboard.mouse.move(aboutBefore.x + aboutBefore.width / 2, aboutBefore.y + aboutBefore.height + 20)
    await dashboard.mouse.down()
    await dashboard.mouse.move(aboutBefore.x + aboutBefore.width / 2 + 170, aboutBefore.y + aboutBefore.height + 120, { steps: 8 })
    await dashboard.mouse.up()
    await dashboard.waitForTimeout(600)
    const aboutWorldPosition = await aboutPreview.evaluate(element => [Number.parseFloat(element.style.left), Number.parseFloat(element.style.top)])
    const movedAbout = await aboutPreview.boundingBox()
    assert(movedAbout)
    dashboard.once('dialog', dialog => dialog.accept('关于页面自定义名'))
    await dashboard.mouse.click(movedAbout.x + movedAbout.width / 2, movedAbout.y + movedAbout.height + 18)

    await dashboard.waitForFunction(async () => {
      const stored = await browser.storage.local.get(null)
      return Object.values(stored).flatMap(value => Array.isArray(value?.thumbnails) ? value.thumbnails : []).length >= 5
        && Object.values(stored).some(value => value?.canvasLayouts?.['/'])
        && Object.values(stored).some(value => value?.pageNames?.['/about'] === '关于页面自定义名')
    }, undefined, { timeout: 20_000 })
    const stored = await worker.evaluate(async () => chrome.storage.local.get(null))
    const thumbnails = Object.values(stored).flatMap(value => Array.isArray(value?.thumbnails) ? value.thumbnails : [])
    const thumbnailTimes = new Map(thumbnails.map(item => [`${item.pageId}:${item.mode}`, item.updatedAt]))
    await dashboard.reload()
    await dashboard.getByText('unplugin-pageflow').waitFor()
    await dashboard.waitForTimeout(1_000)
    const restoredSearch = dashboard.getByPlaceholder('搜索页面…')
    await restoredSearch.fill('About')
    await restoredSearch.press('Enter')
    await dashboard.keyboard.press('Escape')
    await dashboard.waitForTimeout(800)
    const restoredAboutWorldPosition = await dashboard.locator('.page-preview:has(iframe[title="About preview"])')
      .evaluate(element => [Number.parseFloat(element.style.left), Number.parseFloat(element.style.top)])
    assert.deepEqual(restoredAboutWorldPosition, aboutWorldPosition)
    const restored = await worker.evaluate(async () => chrome.storage.local.get(null))
    const restoredThumbnails = Object.values(restored).flatMap(value => Array.isArray(value?.thumbnails) ? value.thumbnails : [])
    assert.equal(restoredThumbnails.length, thumbnails.length)
    assert.deepEqual(restoredThumbnails.filter(item => thumbnailTimes.get(`${item.pageId}:${item.mode}`) !== item.updatedAt)
      .map(item => ({ pageId: item.pageId, mode: item.mode, revision: item.revision })), [])
  } finally {
    await context?.close()
    await rm(userDataDir, { recursive: true, force: true })
    await new Promise(resolve => server.close(resolve))
  }
})
