import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('scans visible page accessibility, interaction, and visual issues', async () => {
  const browser = new Window({ url: 'http://localhost/' })
  const previous = Object.fromEntries(['window', 'document', 'Element', 'HTMLImageElement', 'HTMLInputElement', 'MutationObserver', 'CSS'].map(key => [key, globalThis[key]]))
  Object.assign(globalThis, {
    window: browser,
    document: browser.document,
    Element: browser.Element,
    HTMLImageElement: browser.HTMLImageElement,
    HTMLInputElement: browser.HTMLInputElement,
    MutationObserver: browser.MutationObserver,
    CSS: browser.CSS,
  })
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    browser.document.body.innerHTML = `
      <img id="hero" src="hero.png">
      <img id="sized" src="sized.png" alt="封面" width="320" height="180">
      <button id="named">保存</button>
      <button id="unnamed"></button>
      <label for="email">邮箱</label><input id="email">
      <span id="search-label">搜索</span><input id="search" aria-labelledby="search-label">
      <button id="disabled" disabled></button>
      <uni-button id="mobile-control"></uni-button>
      <div aria-hidden="true"><img id="hidden-image" src="hidden.png"><button id="hidden-button"></button></div>
      <div data-unplugin-pageflow-hotspot-layer><button id="pageflow-control"></button></div>
      <h1>页面标题</h1><h3 id="skipped-heading">跳级标题</h3>
      <a id="empty-link" href="#">占位链接</a>
      <div id="duplicate">一</div><div id="duplicate">二</div>
      <p id="low-contrast" style="color: rgb(119, 119, 119); background-color: rgb(128, 128, 128); font-size: 16px">低对比文字</p>
      <a id="nested" href="/next">下一页<button>详情</button></a>
      <span id="caption" style="font-size: 10px">说明</span>
      <span id="nested-caption" style="font-size: 10px"><span id="nested-caption-text" style="font-size: 10px">内层</span>外层</span>
    `
    browser.document.querySelectorAll('*').forEach((element) => {
      element.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 60, bottom: 48, width: 60, height: 48, toJSON() {} })
    })
    browser.document.querySelector('#unnamed').getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 20, bottom: 20, width: 20, height: 20, toJSON() {} })
    Object.defineProperties(browser.document.documentElement, {
      clientWidth: { configurable: true, value: 375 },
      scrollWidth: { configurable: true, value: 420 },
    })

    const { scanCustomPageDiagnostics, scanPageDiagnostics } = await server.ssrLoadModule('/src/runtime/diagnostics.ts')
    const diagnostics = scanCustomPageDiagnostics()
    const ruleIds = diagnostics.map(item => item.ruleId)

    assert.ok(ruleIds.includes('missing-alt'))
    assert.ok(ruleIds.includes('missing-accessible-name'))
    assert.ok(ruleIds.includes('tap-target-too-small'))
    assert.ok(ruleIds.includes('font-size-too-small'))
    assert.ok(ruleIds.includes('nested-interactive'))
    assert.ok(ruleIds.includes('horizontal-overflow'))
    assert.ok(ruleIds.includes('duplicate-id'))
    assert.ok(ruleIds.includes('heading-order'))
    assert.ok(ruleIds.includes('invalid-link-target'))
    assert.ok(ruleIds.includes('missing-image-dimensions'))
    assert.ok(ruleIds.includes('low-text-contrast'))
    assert.equal(diagnostics.some(item => item.ruleId === 'missing-accessible-name' && item.selector === '#named'), false)
    assert.equal(diagnostics.some(item => item.ruleId === 'missing-accessible-name' && item.selector === '#email'), false)
    assert.equal(diagnostics.some(item => item.ruleId === 'missing-accessible-name' && item.selector === '#search'), false)
    assert.equal(diagnostics.some(item => item.selector === '#disabled'), false)
    assert.equal(diagnostics.some(item => item.selector === '#hidden-image'), false)
    assert.equal(diagnostics.some(item => item.selector === '#hidden-button'), false)
    assert.equal(diagnostics.some(item => item.selector === '#pageflow-control'), false)
    assert.ok(diagnostics.some(item => item.ruleId === 'missing-accessible-name' && item.selector === '#mobile-control'))
    assert.equal(diagnostics.some(item => item.ruleId === 'missing-image-dimensions' && item.selector === '#sized'), false)
    assert.equal(diagnostics.find(item => item.ruleId === 'missing-alt').severity, 'suggestion')
    assert.equal(diagnostics.find(item => item.ruleId === 'heading-order').severity, 'suggestion')
    assert.equal(diagnostics.find(item => item.ruleId === 'duplicate-id').severity, 'suggestion')
    assert.equal(diagnostics.find(item => item.ruleId === 'font-size-too-small').severity, 'suggestion')
    assert.equal(diagnostics.find(item => item.ruleId === 'missing-accessible-name').severity, 'error')
    assert.equal(diagnostics.find(item => item.ruleId === 'tap-target-too-small').severity, 'warning')
    assert.equal(diagnostics.find(item => item.selector === '#empty-link').targetLabel, '链接“占位链接”')
    assert.equal(diagnostics.find(item => item.selector === '#hero').targetLabel, '未命名图片')
    assert.equal(diagnostics.find(item => item.selector === '#mobile-control').targetLabel, '未命名按钮')
    assert.equal(diagnostics.filter(item => item.ruleId === 'font-size-too-small' && item.selector?.startsWith('#nested-caption')).length, 1)
    assert.ok(diagnostics.some(item => item.ruleId === 'font-size-too-small' && item.selector === '#nested-caption-text'))
    assert.equal(new Set(diagnostics.map(item => item.id)).size, diagnostics.length)
    assert.ok(diagnostics.filter(item => item.selector).every(item => item.selector.startsWith('#')))

    const cached = await scanPageDiagnostics()
    assert.strictEqual(await scanPageDiagnostics(), cached)
    browser.document.body.append(browser.document.createElement('p'))
    await Promise.resolve()
    assert.notStrictEqual(await scanPageDiagnostics(), cached)
  } finally {
    await server.close()
    browser.close()
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})
