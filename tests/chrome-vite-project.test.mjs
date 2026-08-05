import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('translates Vite canvas page ids to Chrome runtime urls', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { translateViteCanvasLayouts } = await server.ssrLoadModule('/packages/chrome-extension/utils/vite-project.ts')
    const layouts = translateViteCanvasLayouts({
      '/screen': {
        '/screen/crop': [12, 34],
        missing: [56, 78],
      },
    }, { pages: [{ id: '/screen/crop', path: '/screen/agricultural-products/crop-distribution' }] }, 'https://example.com')
    assert.deepEqual(layouts, {
      '/screen': {
        'https://example.com/screen/agricultural-products/crop-distribution': [12, 34],
      },
    })
  } finally {
    await server.close()
  }
})

test('loads a declared public PageFlow config before fallback locations', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const originalFetch = globalThis.fetch
  try {
    const { loadVitePageFlowProject } = await server.ssrLoadModule('/packages/chrome-extension/utils/vite-project.ts')
    const requested = []
    globalThis.fetch = async (url) => {
      requested.push(String(url))
      if (String(url) !== 'https://cdn.example.com/pageflow.json') return new Response('', { status: 404 })
      return Response.json({
        graph: { pages: [{ id: 'home', title: 'Home', path: '/home' }] },
        groupNames: { home: '首页' },
        canvasLayouts: { '/': { home: [12, 34] } },
      })
    }
    const project = await loadVitePageFlowProject('https://example.com', 'https://cdn.example.com/pageflow.json')
    assert.deepEqual(requested, ['https://cdn.example.com/pageflow.json'])
    assert.equal(project.pages[0].url, 'https://example.com/home')
    assert.deepEqual(project.canvasLayouts, { '/': { 'https://example.com/home': [12, 34] } })
  } finally {
    globalThis.fetch = originalFetch
    await server.close()
  }
})
