import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { chromium } from '@playwright/test'
import { resolvePageFlowVersion } from '../scripts/pageflow-version.mjs'

function startFixtureServer({ performancePages = 0 } = {}) {
  const performanceLinks = Array.from({ length: performancePages }, (_, index) => {
    const group = ['agriculture/ecology', 'agriculture/service', 'machinery/jobs', 'monitoring/fields'][index % 4]
    return `<a href="/${group}/page-${index}">Performance page ${index}</a>`
  }).join('')
  const server = createServer((request, response) => {
    if (request.url?.startsWith('/api/orders')) {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ orders: [{ id: 1, name: 'PageFlow' }] }))
      return
    }
    if (request.url?.startsWith('/screen')) {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end('<!doctype html><html><head><title>Screen fixture</title></head><body style="margin:0"><main id="screen" style="width:3840px;height:1080px;transform:scale(.25);transform-origin:top left">Screen</main></body></html>')
      return
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(`<!doctype html><html><head><title>PageFlow fixture</title></head><body style="min-height:2000px"><main id="app"><button id="route">Route</button><a href="/about" style="position:absolute;top:1200px;left:20px;width:120px;height:40px">About</a><a href="/products/1?ref=first">Product 1</a><a href="/products/2?ref=second">Product 2</a><a href="/articles/first">First article</a><a href="/articles/second">Second article</a><a href="/redirect">Redirect</a>${performanceLinks}<img id="missing-alt"></main><script>document.querySelector("#app").__vue_app__={config:{globalProperties:{$router:{getRoutes:()=>[{path:"/",meta:{title:"Home"}},{path:"/router-only",meta:{title:"Router only"}},{path:"/redirect",redirect:"/about"}],currentRoute:{value:{path:location.pathname}},options:{history:{createHref:path=>path}}}}}}</script></body></html>`)
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

async function waitForExtensionState(worker, tabId, predicate, timeout = 10_000) {
  const startedAt = Date.now()
  let lastState
  while (Date.now() - startedAt < timeout) {
    const state = await worker.evaluate(async id => chrome.tabs.sendMessage(id, { type: 'pageflow:get-state' }), tabId)
    lastState = state
    if (predicate(state)) return state
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out waiting for PageFlow extension state (last page count: ${lastState?.pages?.length ?? 'unknown'})`)
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

test('Chrome extension smoke covers runtime, capture, diagnostics, workbench, and persistence', { timeout: 90_000 }, async () => {
  const server = await startFixtureServer()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'pageflow-chrome-e2e-'))
  const extensionPath = path.resolve(process.env.PAGEFLOW_E2E_EXTENSION_DIR ?? 'packages/chrome-extension/.output/chrome-mv3')
    const manifest = JSON.parse(readFileSync(path.join(extensionPath, 'manifest.json'), 'utf8'))
    assert.equal(manifest.version, resolvePageFlowVersion())
  assert.equal(manifest.devtools_page, undefined)
  assert.equal(manifest.action.default_title, '打开 PageFlow')
  assert.equal(manifest.permissions.includes('debugger'), true)
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
    const screen = await context.newPage()
    await screen.goto(`${origin}/screen`)
    const screenTabId = await worker.evaluate(async url => (await chrome.tabs.query({ url }))[0].id, `${origin}/screen`)
    const screenMetrics = await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'pageflow:get-metrics' }), screenTabId)
    assert.deepEqual([screenMetrics.previewWidth, screenMetrics.previewHeight], [3_840, 1_080])
    await screen.close()
    const tab = await worker.evaluate(async origin => {
      const [tab] = await chrome.tabs.query({ url: `${origin}/*` })
      return { id: tab.id, windowId: tab.windowId }
    }, origin)
    const extensionId = new URL(worker.url()).host
    const dashboard = await context.newPage()
    await dashboard.setViewportSize({ width: 1_440, height: 900 })
    await dashboard.goto(`chrome-extension://${extensionId}/panel.html?tabId=${tab.id}`)
    await dashboard.getByText('unplugin-pageflow').waitFor()
    const session = await dashboard.evaluate(async tabId => chrome.runtime.sendMessage({ type: 'pageflow:start-session', tabId }), tab.id)
    assert.equal(session.ok, true)
    const visibleCapture = await dashboard.evaluate(async tabId => chrome.runtime.sendMessage({ type: 'pageflow:capture', tabId }), tab.id)
    assert.match(visibleCapture.source, /^data:image\/png;base64,/)
    assert(visibleCapture.pageWidth > 0)
    assert(visibleCapture.pageHeight >= 2_000)
    const backgroundCapture = await dashboard.evaluate(async ({ tabId, url }) => chrome.runtime.sendMessage({
      type: 'pageflow:capture-page',
      tabId,
      url,
      viewport: { width: 800, height: 600 },
    }), { tabId: tab.id, url: `${origin}/about` })
    assert.equal(backgroundCapture.ok, true)
    assert.match(backgroundCapture.value.source, /^data:image\/png;base64,/)
    assert.equal(backgroundCapture.value.pageWidth, 800)
    assert(backgroundCapture.value.pageHeight >= 1_200 && backgroundCapture.value.pageHeight < 2_000)
    await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'pageflow:scan' }), tab.id)
    const state = await waitForExtensionState(worker, tab.id, value => value.diagnostics.some(item => item.ruleId === 'missing-alt')
      && value.pages.some(item => new URL(item.url).pathname === '/router-only')
      && !value.pages.some(item => new URL(item.url).pathname === '/redirect'))

    assert.equal(await page.evaluate(() => Boolean(window.__PAGEFLOW_CHROME_RUNTIME__)), true)
    assert.deepEqual(state.pages.map(item => new URL(item.url).pathname), ['/', '/about', '/products/1', '/products/2', '/articles/first', '/articles/second', '/router-only', '/orders'])
    assert.deepEqual(state.edges.map(item => [new URL(item.from).pathname, new URL(item.to).pathname]), [['/', '/about'], ['/', '/products/1'], ['/', '/products/2'], ['/', '/articles/first'], ['/', '/articles/second'], ['/products/2', '/orders'], ['/orders', '/about'], ['/orders', '/products/1'], ['/orders', '/products/2'], ['/orders', '/articles/first'], ['/orders', '/articles/second']])
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

    await dashboard.getByText('2 组 / 8 页').waitFor()
    await dashboard.getByText(`v${resolvePageFlowVersion()}`).waitFor()
    const themeIcon = dashboard.locator('button[aria-label^="切换到"] [data-slot="leadingIcon"]')
    assert.equal(await themeIcon.count(), 1)
    assert.notEqual(await themeIcon.evaluate(element => getComputedStyle(element).maskImage), 'none')
    const canvasBounds = await dashboard.locator('.canvas').evaluate(element => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    })
    assert.deepEqual(canvasBounds, { width: 1_440, height: 826 })
    await dashboard.waitForTimeout(1_000)
    const initialZoom = Number.parseInt(await dashboard.locator('.zoom span').innerText(), 10)
    await dashboard.locator('.zoom button').first().click()
    await dashboard.waitForFunction(value => Number.parseInt(document.querySelector('.zoom span')?.textContent ?? '0', 10) > value, initialZoom)
    await dashboard.locator('.zoom button').last().click()

    const viewportButtons = dashboard.locator('[aria-label="Preview viewport"] button')
    assert.equal(await viewportButtons.count(), 3)
    await viewportButtons.nth(0).click()
    await viewportButtons.nth(2).click()
    const initialDark = (await dashboard.locator('html').getAttribute('class'))?.includes('dark') ?? false
    await dashboard.locator('button[aria-label^="切换到"]').click()
    assert.notEqual((await dashboard.locator('html').getAttribute('class'))?.includes('dark') ?? false, initialDark)

    const search = dashboard.getByPlaceholder('搜索页面…')
    await search.fill('/orders')
    await dashboard.getByRole('option').filter({ hasText: '/orders' }).click()
    await dashboard.locator('iframe[src*="__unplugin-pageflow_preview=1"]').waitFor({ state: 'attached' })
    const detailTabs = dashboard.locator('[aria-label="页面详情"] button')
    await dashboard.getByRole('button', { name: '收起右侧面板' }).click()
    await dashboard.getByRole('button', { name: '展开右侧面板' }).click()
    await detailTabs.filter({ hasText: '测试' }).click()
    await dashboard.getByText('页面检查').waitFor()
    await page.evaluate(() => fetch('/api/orders?page=focused').then(response => response.json()))
    await detailTabs.filter({ hasText: '接口' }).click()
    await dashboard.waitForTimeout(1_000)
    const apiPanelText = await dashboard.locator('.api-panel-content').innerText()
    assert.match(apiPanelText, /\/orders/, apiPanelText)
    const focusedRequest = dashboard.getByText('/orders', { exact: true })
    await focusedRequest.waitFor()
    await focusedRequest.click()
    await dashboard.locator('.api-field-tree').waitFor()
    await dashboard.keyboard.press('Escape')
    await dashboard.waitForFunction(() => [...document.querySelectorAll('.page-preview')].every(element => getComputedStyle(element).pointerEvents === 'none'))
    await search.fill('About')
    await dashboard.getByRole('option', { name: /About/ }).click()
    await dashboard.locator('iframe[title="About preview"]').waitFor({ state: 'attached' })
    await detailTabs.filter({ hasText: '诊断' }).click()
    await dashboard.getByRole('button', { name: '重新扫描页面' }).click()
    await detailTabs.filter({ hasText: '待办' }).click()
    await dashboard.getByRole('textbox', { name: '添加当前页面待办' }).fill('Chrome smoke todo')
    await dashboard.getByRole('button', { name: '添加' }).click()
    await dashboard.getByText('Chrome smoke todo').waitFor()
    const smokeTodo = dashboard.locator('.todo-item', { hasText: 'Chrome smoke todo' })
    await smokeTodo.locator('input[type="checkbox"]').check()
    assert.equal(await smokeTodo.locator('input[type="checkbox"]').isChecked(), true)
    await dashboard.getByRole('textbox', { name: '添加当前页面待办' }).fill('Delete Chrome smoke todo')
    await dashboard.getByRole('button', { name: '添加' }).click()
    const deletedTodo = dashboard.locator('.todo-item', { hasText: 'Delete Chrome smoke todo' })
    await deletedTodo.getByRole('button', { name: '删除待办' }).click()
    assert.equal(await deletedTodo.count(), 0)
    await dashboard.keyboard.press('Escape')
    await dashboard.waitForFunction(() => [...document.querySelectorAll('.page-preview')].every(element => getComputedStyle(element).pointerEvents === 'none'))
    await dashboard.waitForTimeout(1_000)
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
    const openedPagePromise = context.waitForEvent('page')
    await dashboard.mouse.click(movedAbout.x + movedAbout.width - 10, movedAbout.y + movedAbout.height + 18)
    const openedPage = await openedPagePromise
    await openedPage.waitForLoadState('domcontentloaded')
    assert.equal(new URL(openedPage.url()).pathname, '/about')
    await openedPage.close()
    dashboard.once('dialog', dialog => dialog.accept('关于页面自定义名'))
    await dashboard.mouse.click(movedAbout.x + movedAbout.width / 2, movedAbout.y + movedAbout.height + 18)

    await dashboard.waitForFunction(async () => {
      const stored = await browser.storage.local.get(null)
      return Object.values(stored).flatMap(value => Array.isArray(value?.thumbnails) ? value.thumbnails : []).length >= 8
        && Object.values(stored).some(value => value?.canvasLayouts?.['/'])
        && Object.values(stored).some(value => value?.pageNames?.['/about'] === '关于页面自定义名')
        && Object.entries(stored).some(([key, value]) => key.startsWith('pageflow:runtime:')
          && value?.pages?.some(page => new URL(page.url).pathname === '/products/1'))
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

test('Chrome extension performance smoke keeps a large grouped canvas responsive', { timeout: 60_000 }, async () => {
  const server = await startFixtureServer({ performancePages: 120 })
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'pageflow-chrome-performance-'))
  const extensionPath = path.resolve(process.env.PAGEFLOW_E2E_EXTENSION_DIR ?? 'packages/chrome-extension/.output/chrome-mv3')
  let context
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath: chromiumExecutable(),
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    })
    const origin = `http://127.0.0.1:${portOf(server)}`
    const target = await context.newPage()
    await target.goto(origin)
    const worker = await extensionWorker(context)
    const tabId = await worker.evaluate(async origin => (await chrome.tabs.query({ url: `${origin}/*` }))[0].id, origin)
    await waitForExtensionState(worker, tabId, state => state.pages.length >= 127, 20_000)

    const dashboard = await context.newPage()
    await dashboard.setViewportSize({ width: 1_440, height: 900 })
    await dashboard.addInitScript(() => {
      window.__pageflowPerformance = { frameGaps: [], longTasks: [] }
      let previousFrame = performance.now()
      const sampleFrame = (now) => {
        window.__pageflowPerformance.frameGaps.push(now - previousFrame)
        previousFrame = now
        requestAnimationFrame(sampleFrame)
      }
      requestAnimationFrame(sampleFrame)
      new PerformanceObserver(list => list.getEntries().forEach(entry => window.__pageflowPerformance.longTasks.push(entry.duration))).observe({ type: 'longtask', buffered: true })
    })
    const startedAt = performance.now()
    const extensionId = new URL(worker.url()).host
    await dashboard.goto(`chrome-extension://${extensionId}/panel.html?tabId=${tabId}`)
    await dashboard.getByText(/\d+ 组 \/ 127 页/).waitFor()
    const readyDuration = performance.now() - startedAt

    const search = dashboard.getByPlaceholder('搜索页面…')
    const interactionDurations = []
    for (const pageNumber of [0, 17, 38, 63, 84, 119]) {
      const interactionStartedAt = performance.now()
      await search.fill(`/page-${pageNumber}`)
      await dashboard.getByRole('option').filter({ hasText: `/page-${pageNumber}` }).click()
      await dashboard.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      interactionDurations.push(performance.now() - interactionStartedAt)
      await dashboard.keyboard.press('Escape')
    }
    await dashboard.waitForTimeout(500)
    const samples = await dashboard.evaluate(() => window.__pageflowPerformance)
    const maxFrameGap = Math.max(...samples.frameGaps)
    const maxLongTask = Math.max(0, ...samples.longTasks)
    const maxInteraction = Math.max(...interactionDurations)

    assert(readyDuration < 10_000, `large canvas took ${Math.round(readyDuration)}ms to become ready (budget: 10000ms)`)
    assert(maxInteraction < 2_500, `group navigation took ${Math.round(maxInteraction)}ms (budget: 2500ms)`)
    assert(maxFrameGap < 750, `main thread stalled for ${Math.round(maxFrameGap)}ms (budget: 750ms)`)
    assert(maxLongTask < 500, `long task lasted ${Math.round(maxLongTask)}ms (budget: 500ms)`)
  } finally {
    await context?.close()
    await new Promise(resolve => server.close(resolve))
    await rm(userDataDir, { recursive: true, force: true })
  }
})
