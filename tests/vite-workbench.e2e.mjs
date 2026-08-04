import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

test('Vite workbench smoke covers navigation, focus, viewport, theme, hotspots, diagnostics, and todos', { timeout: 60_000 }, async () => {
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
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${origin}/__unplugin-pageflow/`, { waitUntil: 'networkidle' })
    await page.getByText('0 组 / 5 页').waitFor()
    assert.equal(await page.locator('.canvas').getAttribute('data-rendered-pages'), '5')

    const search = page.getByPlaceholder('搜索页面…')
    await search.fill('Checkout')
    const result = page.getByRole('option', { name: /Checkout/ })
    await result.waitFor()
    await result.click()

    await page.getByRole('button', { name: '切换到暗黑模式' }).click()
    assert.equal((await page.locator('html').getAttribute('class'))?.includes('dark'), true)
    await page.getByRole('button', { name: '切换到浅色模式' }).click()

    const viewportButtons = page.locator('[aria-label="Preview viewport"] button')
    assert.equal(await viewportButtons.count(), 3)
    await viewportButtons.nth(0).click()
    await viewportButtons.nth(2).click()

    await page.locator('iframe[src*="__unplugin-pageflow_preview=1"]').waitFor({ state: 'visible' })
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

    const detailTabs = page.locator('[aria-label="页面详情"] button')
    await detailTabs.filter({ hasText: '诊断' }).click()
    await page.getByRole('button', { name: '重新扫描页面' }).click()
    await detailTabs.filter({ hasText: '待办' }).click()
    await page.getByRole('textbox', { name: '添加待办' }).fill('Smoke todo')
    await page.getByRole('button', { name: '添加' }).click()
    await page.getByText('Smoke todo').waitFor()
    assert.deepEqual(errors, [])
  } finally {
    await browser?.close()
    await server.close()
  }
})
