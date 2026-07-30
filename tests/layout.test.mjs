import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('lays out linked pages in layers and limits previews to the viewport', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { getVisiblePageIds, layoutPages } = await server.ssrLoadModule('/src/client/layout.ts')
    const { PAGEFLOW_CANVAS_CONFIG } = await server.ssrLoadModule('/src/client/canvas.ts')
    const { resolvePreviewUrl } = await server.ssrLoadModule('/src/client/preview.ts')
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
    assert.equal(PAGEFLOW_CANVAS_CONFIG.move.dragEmpty, true)
    const positions = layoutPages(pages)

    assert.deepEqual(positions.get('page-0'), [80, 90])
    assert.deepEqual(positions.get('page-1'), [430, 90])
    assert.deepEqual(positions.get('page-2'), [780, 90])

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
    assert.equal(resolvePreviewUrl('/products/:id', {
      enabled: true,
      previewPath: '/__unplugin-pageflow/',
      appUrl: '/app/',
      dynamicParams: { '/products/:id': { id: 'demo-product' } },
    }, 'http://localhost'), '/app/products/demo-product?__unplugin-pageflow_preview=1')
  } finally {
    await server.close()
  }
})
