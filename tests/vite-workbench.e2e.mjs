import assert from 'node:assert/strict'
import { readFile, rm, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

test('Vite workbench smoke covers navigation, focus, viewport, theme, hotspots, diagnostics, and todos', { timeout: 60_000 }, async () => {
  const canvasConfigFile = fileURLToPath(new URL('../playground/basic/.pageflow', import.meta.url))
  const originalCanvasConfig = await readFile(canvasConfigFile, 'utf8').catch(() => undefined)
  if (originalCanvasConfig == null) await writeFile(canvasConfigFile, '{}\n')
  const server = await createServer({
    configFile: fileURLToPath(new URL('../playground/basic/vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'silent',
  })
  server.middlewares.stack.unshift({ route: '/api/smoke', handle: (_request, response) => {
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ ok: true, item: { id: 1, name: 'PageFlow' } }))
  } })
  let browser
  try {
    await server.listen()
    const origin = server.resolvedUrls.local[0].replace(/\/$/, '')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const errors = []
    let savedCanvasLayout
    page.on('request', (request) => {
      if (request.url().endsWith('/__unplugin-pageflow/api/canvas-layout')) savedCanvasLayout = request.postDataJSON()
    })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${origin}/__unplugin-pageflow/`, { waitUntil: 'networkidle' })
    await page.getByText('0 组 / 5 页').waitFor()
    assert.equal(await page.locator('.canvas').getAttribute('data-rendered-pages'), '5')
    await page.waitForFunction(() => Number.parseInt(document.querySelector('.zoom span')?.textContent ?? '100', 10) <= 90)
    const initialZoom = Number.parseInt(await page.locator('.zoom span').innerText(), 10)
    await page.locator('.zoom button').first().click()
    assert(Number.parseInt(await page.locator('.zoom span').innerText(), 10) > initialZoom)
    await page.locator('.zoom button').last().click()

    const search = page.getByPlaceholder('搜索页面…')
    await search.fill('Checkout')
    const result = page.getByRole('option', { name: /Checkout/ })
    await result.waitFor()
    await search.press('Enter')
    assert.equal(await page.locator('.page-user-label').count(), 0)

    await page.getByRole('button', { name: '切换到暗黑模式' }).click()
    assert.equal((await page.locator('html').getAttribute('class'))?.includes('dark'), true)
    await page.getByRole('button', { name: '切换到浅色模式' }).click()

    const viewportButtons = page.locator('[aria-label="Preview viewport"] button')
    assert.equal(await viewportButtons.count(), 3)
    await viewportButtons.nth(0).click()
    await viewportButtons.nth(2).click()

    await page.locator('iframe[src*="__unplugin-pageflow_preview=1"]').waitFor({ state: 'attached' })
    assert.equal(await page.locator('iframe[title="Capture preview"]').getAttribute('src'), 'about:blank')
    const frame = page.frames().find(item => item.url().includes('__unplugin-pageflow_preview=1'))
    assert(frame)
    await frame.waitForSelector('[data-unplugin-pageflow-hotspot]')

    await frame.evaluate(() => {
      document.body.style.minHeight = '2400px'
      const link = document.createElement('a')
      link.href = '/checkout'
      link.textContent = 'Offscreen smoke link'
      link.style.cssText = 'position:absolute;top:1600px;left:40px;width:180px;height:40px'
      document.body.append(link)
    })
    await page.waitForTimeout(150)
    assert.equal(await frame.locator('[data-unplugin-pageflow-hotspot]').evaluateAll(items => items.some(item => item.style.top === '1600px')), false)
    await frame.evaluate(() => scrollTo(0, 1450))
    await page.waitForTimeout(250)
    assert.equal(await frame.locator('[data-unplugin-pageflow-hotspot]').evaluateAll(items => items.some(item => Number.parseFloat(item.style.top) >= 100)), true)

    await frame.evaluate(() => fetch('/api/smoke').then(response => response.json()))
    const detailTabs = page.locator('[aria-label="页面详情"] button')
    await page.getByRole('button', { name: '收起右侧面板' }).click()
    await page.getByRole('button', { name: '展开右侧面板' }).click()
    await detailTabs.filter({ hasText: '测试' }).click()
    await page.getByText('页面检查').waitFor()
    await detailTabs.filter({ hasText: '接口' }).click()
    const requestItem = page.getByRole('button', { name: /GET.*\/smoke.*200.*ms/ })
    await requestItem.waitFor()
    await requestItem.click()
    await page.getByRole('button', { name: /显示未使用字段/ }).click()
    await page.locator('.api-fields').waitFor()

    await detailTabs.filter({ hasText: '诊断' }).click()
    await page.getByRole('button', { name: '重新扫描页面' }).click()
    await detailTabs.filter({ hasText: '待办' }).click()
    await page.getByRole('textbox', { name: '添加当前页面待办' }).fill('Smoke todo')
    await page.getByRole('button', { name: '添加' }).click()
    await page.getByText('Smoke todo').waitFor()
    const smokeTodo = page.locator('.todo-item', { hasText: 'Smoke todo' })
    await smokeTodo.locator('input[type="checkbox"]').check()
    assert.equal(await smokeTodo.locator('input[type="checkbox"]').isChecked(), true)
    await page.getByRole('textbox', { name: '添加当前页面待办' }).fill('Delete smoke todo')
    await page.getByRole('button', { name: '添加' }).click()
    const deletedTodo = page.locator('.todo-item', { hasText: 'Delete smoke todo' })
    await deletedTodo.getByRole('button', { name: '删除待办' }).click()
    assert.equal(await deletedTodo.count(), 0)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => [...document.querySelectorAll('.page-preview')].every(element => getComputedStyle(element).pointerEvents === 'none'))
    await page.waitForTimeout(1_000)
    const checkoutPreview = page.locator('.page-preview[data-page-id="checkout"]')
    const checkoutBefore = await checkoutPreview.boundingBox()
    assert(checkoutBefore)
    await page.mouse.move(checkoutBefore.x + checkoutBefore.width / 2, checkoutBefore.y + checkoutBefore.height + 20)
    await page.mouse.down()
    await page.mouse.move(checkoutBefore.x + checkoutBefore.width / 2 - 170, checkoutBefore.y + checkoutBefore.height + 120, { steps: 8 })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const checkoutDuringDrag = await checkoutPreview.boundingBox()
    assert(checkoutDuringDrag)
    assert(checkoutDuringDrag.x < checkoutBefore.x - 150)
    assert(checkoutDuringDrag.y > checkoutBefore.y + 90)
    await page.mouse.up()
    await page.waitForTimeout(600)
    const checkoutAfter = await checkoutPreview.boundingBox()
    assert(checkoutAfter)
    assert(Math.hypot(checkoutAfter.x - checkoutDuringDrag.x, checkoutAfter.y - checkoutDuringDrag.y) > 20)
    const openedPagePromise = page.waitForEvent('popup')
    await page.mouse.click(checkoutAfter.x + checkoutAfter.width - 10, checkoutAfter.y + checkoutAfter.height + 18)
    const openedPage = await openedPagePromise
    await openedPage.waitForLoadState('domcontentloaded')
    assert.equal(new URL(openedPage.url()).pathname, '/checkout')
    assert.equal(new URL(openedPage.url()).searchParams.get('__unplugin-pageflow_preview'), '1')
    await openedPage.close()
    page.once('dialog', dialog => dialog.accept('结算自定义名'))
    await page.mouse.click(checkoutAfter.x + checkoutAfter.width / 2, checkoutAfter.y + checkoutAfter.height + 18)
    await page.waitForTimeout(300)
    assert.equal(savedCanvasLayout.key, '/')
    assert.deepEqual(Object.keys(savedCanvasLayout.positions).sort(), ['checkout', 'explore', 'home', 'product', 'sign-in'])
    const storedCanvasConfig = JSON.parse(await readFile(canvasConfigFile, 'utf8'))
    assert.deepEqual(storedCanvasConfig.canvasLayouts['/'].checkout, savedCanvasLayout.positions.checkout)
    assert.equal(storedCanvasConfig.pageNames['/checkout'], '结算自定义名')
    const checkoutWorldPosition = await checkoutPreview.evaluate(element => [Number.parseFloat(element.style.left), Number.parseFloat(element.style.top)])
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByText('0 组 / 5 页').waitFor()
    const restoredSearch = page.getByPlaceholder('搜索页面…')
    await restoredSearch.fill('Checkout')
    await restoredSearch.press('Enter')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(800)
    const restoredCheckoutPreview = page.locator('.page-preview[data-page-id="checkout"]')
    const restoredWorldPosition = await restoredCheckoutPreview.evaluate(element => [Number.parseFloat(element.style.left), Number.parseFloat(element.style.top)])
    assert.deepEqual(restoredWorldPosition, checkoutWorldPosition)
    assert.deepEqual(errors, [])
  } finally {
    await browser?.close()
    await server.close()
    if (originalCanvasConfig == null) await rm(canvasConfigFile, { force: true })
    else await writeFile(canvasConfigFile, originalCanvasConfig)
  }
})
