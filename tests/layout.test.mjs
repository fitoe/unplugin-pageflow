import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('lays out linked pages in layers and limits previews to the viewport', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createPageSpatialIndex, getAutoPreviewPageId, getRenderablePages, getVisiblePageIds, layoutPages, queryPageSpatialIndex } = await server.ssrLoadModule('/src/client/layout.ts')
    const { forwardWheelToCanvas, PAGEFLOW_CANVAS_CONFIG } = await server.ssrLoadModule('/src/client/canvas.ts')
    const { resolvePreviewUrl, touchPreviewCache } = await server.ssrLoadModule('/src/client/preview.ts')
    const { fullThumbnailTiles, thumbnailSlot, thumbnailTierForZoom, visibleThumbnailTiles } = await server.ssrLoadModule('/src/client/thumbnails.ts')
    const pages = Array.from({ length: 30 }, (_, index) => ({
      id: `page-${index}`,
      title: `Page ${index}`,
      path: `/page-${index}`,
      accent: '#ff795d',
      links: index < 2 ? [{ label: 'Next', to: `page-${index + 1}` }] : [],
    }))
    assert.equal(PAGEFLOW_CANVAS_CONFIG.type, 'viewport')
    assert.deepEqual(PAGEFLOW_CANVAS_CONFIG.zoom, { min: 0.05, max: 32 })
    assert.equal(PAGEFLOW_CANVAS_CONFIG.wheel.zoomMode, true)
    assert.equal(PAGEFLOW_CANVAS_CONFIG.wheel.zoomSpeed, 0.025)
    assert.equal(PAGEFLOW_CANVAS_CONFIG.move.dragEmpty, true)
    assert.deepEqual(touchPreviewCache([], 'home'), ['home'])
    assert.deepEqual(touchPreviewCache(['home', 'about', 'contact'], 'home'), ['about', 'contact', 'home'])
    assert.deepEqual(touchPreviewCache(['home', 'about', 'contact'], 'settings'), ['home', 'about', 'contact', 'settings'])
    assert.deepEqual(touchPreviewCache(['home', 'about', 'contact'], 'settings', 3), ['about', 'contact', 'settings'])
    const wheelCalls = []
    forwardWheelToCanvas({
      getLocal: ({ clientX, clientY }) => ({ x: clientX - 10, y: clientY - 20 }),
      wheel: data => wheelCalls.push(data),
    }, { deltaX: 0, deltaY: -120, ctrlKey: true }, 110, 220)
    assert.equal(wheelCalls.length, 1)
    assert.deepEqual(
      { x: wheelCalls[0].x, y: wheelCalls[0].y, deltaX: wheelCalls[0].deltaX, deltaY: wheelCalls[0].deltaY, ctrlKey: wheelCalls[0].ctrlKey },
      { x: 100, y: 200, deltaX: 0, deltaY: -120, ctrlKey: true },
    )
    assert.equal(thumbnailTierForZoom(49), 'compact')
    assert.equal(thumbnailTierForZoom(50), 'full')
    const positions = layoutPages(pages)

    assert.deepEqual(positions.get('page-0'), [64, 64])
    assert.deepEqual(positions.get('page-1'), [384, 64])
    assert.deepEqual(positions.get('page-2'), [704, 64])

    const variablePositions = layoutPages([
      { id: 'short', links: [] },
      { id: 'long', links: [] },
    ], new Map([['short', 500], ['long', 900]]))
    assert.deepEqual(variablePositions.get('short'), [64, 64])
    assert.deepEqual(variablePositions.get('long'), [64, 612])

    const visible = getVisiblePageIds(
      pages,
      positions,
      { width: 1000, height: 700 },
      { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      0,
    )
    assert(visible.has('page-0'))
    assert(visible.has('page-1'))
    assert(visible.has('page-2'))
    assert(visible.size < pages.length)
    assert.equal(getAutoPreviewPageId(
      pages,
      positions,
      { width: 1000, height: 700 },
      { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    ), undefined)
    assert.equal(getAutoPreviewPageId(
      pages,
      positions,
      { width: 1000, height: 700 },
      { x: 0, y: 0, scaleX: 1.25, scaleY: 1.25 },
    ), 'page-1')

    const manyPages = Array.from({ length: 10_000 }, (_, index) => ({
      id: `large-${index}`,
      title: `Large ${index}`,
      path: `/large-${index}`,
      accent: '#ff795d',
      links: [],
    }))
    const manyPositions = layoutPages(manyPages)
    const manyIndex = createPageSpatialIndex(manyPages, manyPositions)
    assert(queryPageSpatialIndex(manyIndex, { left: 0, top: 0, right: 1000, bottom: 700 }).size < 20)
    const limited = getVisiblePageIds(
      manyPages,
      manyPositions,
      { width: 1000, height: 700 },
      { x: 0, y: 0, scaleX: 0.01, scaleY: 0.01 },
      240,
      new Map(),
      96,
      manyIndex,
    )
    assert.equal(limited.size, 96)
    const renderable = getRenderablePages(manyPages, new Set(manyPages.map(page => page.id)), ['large-9998', 'large-9999'], 96)
    assert.equal(renderable.length, 98)
    assert(renderable.some(page => page.id === 'large-9999'))

    const tileManifest = Object.fromEntries(Array.from({ length: 3 }, (_, index) => {
      const slot = thumbnailSlot('home', 'pc', 'full', index)
      return [slot, {
        slot,
        revision: 'one',
        width: 240,
        height: 512,
        pageHeight: 1536,
        tileCount: 3,
        tileIndex: index,
        tileTop: index * 512,
        mimeType: 'image/webp',
        file: `${index}.webp`,
        updatedAt: 1,
      }]
    }))
    const tiles = fullThumbnailTiles(tileManifest, 'home', 'pc')
    assert.equal(tiles.length, 3)
    assert.deepEqual(
      visibleThumbnailTiles(tiles, 64, { width: 1000, height: 700 }, { x: 0, y: 0, scaleX: 1, scaleY: 1 }, 0).map(tile => tile.tileIndex),
      [0, 1],
    )
    assert.equal(resolvePreviewUrl('/products/:id', {
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/app/',
      dynamicParams: { '/products/:id': { id: 'demo-product' } },
    }, 'http://localhost'), '/app/products/demo-product?__unplugin-pageflow_preview=1')
    assert.equal(resolvePreviewUrl('/products/:id', {
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/app/',
      dynamicParams: { '/products/:id': { id: 'demo-product' } },
    }, 'http://localhost', 'hash'), '/app/?__unplugin-pageflow_preview=1#/products/demo-product')
  } finally {
    await server.close()
  }
})
