import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('captures the real page root and saves compact plus reversed full tiles', async () => {
  const window = new Window()
  Object.assign(globalThis, { HTMLElement: window.HTMLElement })
  window.document.body.innerHTML = '<div class="wrapper"><main class="home-page pageflow-preview">Page</main></div>'
  const snapshot = { width: 786, height: 1704 }
  const compact = { width: 96, height: 208 }
  const tiles = [{ width: 786, height: 512 }, { width: 786, height: 512 }]
  const saved = []
  let renderTarget
  let renderOptions
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { capturePageThumbnails } = await server.ssrLoadModule('/src/client/snapshot-capture.ts')
    const records = await capturePageThumbnails({
      config: { enabled: true, previewPath: '/preview/', appUrl: '/', dynamicParams: {}, previewRoles: [], groupNames: {} },
      document: window.document,
      body: window.document.body,
      pageId: 'home',
      previewMode: 'mobile',
      mode: { width: 393, height: 852 },
      revision: 'revision-1',
      highResolution: true,
    }, {
      render: async (target, options) => {
        renderTarget = target
        renderOptions = options
        return snapshot
      },
      resize: () => compact,
      tileCount: () => 2,
      extractTile: (_source, index) => tiles[index],
      encode: async () => new Blob(['image'], { type: 'image/webp' }),
      save: async (_config, record) => {
        saved.push({ ...record })
        return { ...record, mimeType: 'image/webp', file: `${record.slot}.webp`, updatedAt: 1 }
      },
    })
    assert.equal(renderTarget, window.document.querySelector('.home-page.pageflow-preview'))
    assert.deepEqual({ height: renderOptions.height, width: renderOptions.width, scale: renderOptions.scale }, { height: 852, width: 393, scale: 2 })
    assert.deepEqual(saved.map(record => [record.slot, record.height, record.tileTop]), [
      ['mobile:compact:home', 520, undefined],
      ['mobile:full:home:tile:1', 156, 156],
      ['mobile:full:home:tile:0', 156, 0],
    ])
    assert.equal(records.length, 3)
    assert.deepEqual([snapshot.width, snapshot.height, compact.width, compact.height], [0, 0, 0, 0])
    assert(tiles.every(tile => tile.width === 0 && tile.height === 0))
  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})

test('uses modern-screenshot first and falls back to html2canvas-pro', async () => {
  const window = new Window()
  Object.assign(globalThis, { Element: window.Element, HTMLElement: window.HTMLElement })
  const target = window.document.createElement('main')
  target.innerHTML = '<div data-unplugin-pageflow-hotspot-layer></div><span>Page</span>'
  const modernCanvas = { width: 200, height: 300 }
  const fallbackCanvas = { width: 100, height: 150 }
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { renderSnapshotCanvas } = await server.ssrLoadModule('/src/client/snapshot-capture.ts')
    let modernOptions
    let fallbackCalls = 0
    const primary = await renderSnapshotCanvas(target, { backgroundColor: '#fff', height: 852, scale: 2, width: 393 }, {
      primary: async (_target, options) => {
        modernOptions = options
        return modernCanvas
      },
      fallback: async () => {
        fallbackCalls++
        return fallbackCanvas
      },
    })
    const clone = target.cloneNode(true)
    await modernOptions.onCloneNode(clone)
    assert.equal(clone.querySelector('[data-unplugin-pageflow-hotspot-layer]'), null)
    assert.equal(primary, modernCanvas)
    assert.equal(fallbackCalls, 0)
    assert.deepEqual({ height: modernOptions.height, scale: modernOptions.scale, width: modernOptions.width }, { height: 852, scale: 2, width: 393 })

    const fallback = await renderSnapshotCanvas(target, { backgroundColor: '#fff' }, {
      primary: async () => { throw new Error('modern failed') },
      fallback: async () => {
        fallbackCalls++
        return fallbackCanvas
      },
    })
    assert.equal(fallback, fallbackCanvas)
    assert.equal(fallbackCalls, 1)
  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})
