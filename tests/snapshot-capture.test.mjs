import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('captures the real page root and saves a single full image when it fits', async () => {
  const window = new Window()
  Object.assign(globalThis, { HTMLElement: window.HTMLElement })
  window.document.body.innerHTML = '<div class="wrapper"><main class="home-page pageflow-preview">Page</main></div><div class="teleported-dialog">Dialog</div>'
  const snapshot = { width: 786, height: 1704 }
  const compact = { width: 240, height: 520 }
  const tiles = [{ width: 786, height: 512 }, { width: 786, height: 512 }]
  const saved = []
  let renderTarget
  let renderOptions
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { capturePageThumbnails, snapshotCaptureScale } = await server.ssrLoadModule('/src/client/snapshot-capture.ts')
    assert.equal(snapshotCaptureScale(3840, true), 0.25)
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
        assert.match(window.document.getElementById('unplugin-pageflow-snapshot-scrollbars')?.textContent ?? '', /webkit-scrollbar/)
        return snapshot
      },
      resize: (_source, width) => {
        assert.equal(width, 240)
        return compact
      },
      tileCount: () => 2,
      extractTile: (_source, index) => tiles[index],
      encode: async () => new Blob(['image'], { type: 'image/webp' }),
      save: async (_config, record) => {
        saved.push({ ...record })
        return { ...record, mimeType: 'image/webp', file: `${record.slot}.webp`, updatedAt: 1 }
      },
    })
    assert.equal(renderTarget, window.document.body)
    assert(renderTarget.querySelector('.teleported-dialog'))
    assert.deepEqual({ height: renderOptions.height, width: renderOptions.width, scale: renderOptions.scale }, { height: 852, width: 393, scale: 2 })
    assert.deepEqual(saved.map(record => [record.slot, record.height, record.tileTop]), [
      ['mobile:compact:home', 520, undefined],
      ['mobile:full:home', 520, undefined],
    ])
    assert.equal(records.length, 2)
    assert.equal(window.document.getElementById('unplugin-pageflow-snapshot-scrollbars'), null)
    assert.deepEqual([snapshot.width, snapshot.height, compact.width, compact.height], [0, 0, 0, 0])
    assert.deepEqual(tiles, [{ width: 786, height: 512 }, { width: 786, height: 512 }])
  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})

test('keeps full-image tiles for snapshots taller than the single-image limit', async () => {
  const window = new Window()
  Object.assign(globalThis, { HTMLElement: window.HTMLElement })
  const snapshot = { width: 786, height: 5000 }
  const compact = { width: 240, height: 1527 }
  const tiles = [{ width: 786, height: 512 }, { width: 786, height: 512 }]
  const saved = []
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { capturePageThumbnails } = await server.ssrLoadModule('/src/client/snapshot-capture.ts')
    await capturePageThumbnails({
      config: { enabled: true, previewPath: '/preview/', appUrl: '/', dynamicParams: {}, previewRoles: [], groupNames: {} },
      document: window.document,
      body: window.document.body,
      pageId: 'long',
      previewMode: 'pc',
      mode: { width: 1920, height: 1080 },
      revision: 'revision-1',
      highResolution: true,
    }, {
      render: async () => snapshot,
      resize: (_source, width) => {
        assert.equal(width, 240)
        return compact
      },
      tileCount: () => 2,
      extractTile: (_source, index) => tiles[index],
      encode: async () => new Blob(['image'], { type: 'image/webp' }),
      save: async (_config, record) => {
        saved.push({ ...record })
        return { ...record, mimeType: 'image/webp', file: `${record.slot}.webp`, updatedAt: 1 }
      },
    })
    assert.deepEqual(saved.map(record => record.slot), [
      'pc:compact:long',
      'pc:full:long:tile:1',
      'pc:full:long:tile:0',
    ])
    assert(tiles.every(tile => tile.width === 0 && tile.height === 0))
  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})

test('uses modern-screenshot and preserves canvas pages', async () => {
  const window = new Window()
  Object.assign(globalThis, { Element: window.Element, HTMLElement: window.HTMLElement })
  const target = window.document.createElement('main')
  target.innerHTML = '<div data-unplugin-pageflow-hotspot-layer></div><div data-unplugin-pageflow-launcher></div><span>Page</span>'
  window.document.head.innerHTML = '<style>canvas { display: block; width: 120px; height: 60px; }</style>'
  window.document.body.append(target)
  const modernCanvas = { width: 200, height: 300 }
  const nativeGetContext = window.HTMLCanvasElement.prototype.getContext
  const nativeToDataURL = window.HTMLCanvasElement.prototype.toDataURL
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} })
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { hasMeaningfulSnapshotPixels, renderSnapshotCanvas } = await server.ssrLoadModule('/src/client/snapshot-capture.ts')
    assert.equal(hasMeaningfulSnapshotPixels(new Uint8ClampedArray(16).fill(255)), false)
    assert.equal(hasMeaningfulSnapshotPixels(new Uint8ClampedArray([
      255, 255, 255, 255,
      255, 255, 255, 255,
      0, 80, 160, 255,
      0, 80, 160, 255,
    ])), true)
    let modernOptions
    const primary = await renderSnapshotCanvas(target, { backgroundColor: '#fff', height: 852, scale: 2, width: 393 }, {
      primary: async (_target, options) => {
        modernOptions = options
        return modernCanvas
      },
    })
    const clone = target.cloneNode(true)
    await modernOptions.onCloneNode(clone)
    assert.equal(clone.querySelector('[data-unplugin-pageflow-hotspot-layer]'), null)
    assert.equal(clone.querySelector('[data-unplugin-pageflow-launcher]'), null)
    assert.equal(primary, modernCanvas)
    assert.deepEqual({ height: modernOptions.height, scale: modernOptions.scale, width: modernOptions.width }, { height: 852, scale: 2, width: 393 })

    target.append(window.document.createElement('canvas'))
    let canvasPrimaryCalls = 0
    const canvasSnapshot = await renderSnapshotCanvas(target, { backgroundColor: '#fff' }, {
      primary: async (captureTarget) => {
        canvasPrimaryCalls++
        assert.equal(captureTarget.querySelectorAll('canvas').length, 0)
        assert.equal(captureTarget.querySelectorAll('img').length, 1)
        assert.equal(captureTarget.querySelector('img')?.style.width, '120px')
        assert.equal(captureTarget.querySelector('img')?.style.height, '60px')
        return modernCanvas
      },
    })
    assert.equal(canvasSnapshot, modernCanvas)
    assert.equal(canvasPrimaryCalls, 1)
    assert.equal(target.querySelectorAll('canvas').length, 1)
    target.remove()
  } finally {
    window.HTMLCanvasElement.prototype.getContext = nativeGetContext
    window.HTMLCanvasElement.prototype.toDataURL = nativeToDataURL
    await server.close()
    await window.happyDOM.close()
  }
})
