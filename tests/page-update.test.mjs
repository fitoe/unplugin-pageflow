import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('plans page updates without losing scanned focus links', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { planPageUpdate } = await server.ssrLoadModule('/src/client/page-update.ts')
    const link = to => ({ label: to, to })
    const page = (id, links, title = id) => ({ id, path: `/${id}`, title, accent: '#fff', links })
    const scannedLinks = [link('/detail')]
    const current = page('home', [])

    const preserved = planPageUpdate({
      pages: [current],
      nextPage: page('home', [], 'Home'),
      focusedPageId: 'home',
      scannedPageId: 'home',
      focusedLinks: scannedLinks,
    })
    assert.equal(preserved.focusedLinks, scannedLinks)
    assert.equal(preserved.pageChanged, true)
    assert.equal(preserved.action, undefined)
    assert.equal(preserved.pages[0].title, 'Home')

    const targetsChanged = planPageUpdate({
      pages: [current],
      nextPage: page('home', [link('/other')]),
      focusedPageId: 'home',
      focusedLinks: scannedLinks,
    })
    assert.deepEqual(targetsChanged.focusedLinks, [link('/other')])
    assert.equal(targetsChanged.action, 'layout')

    const nonFocused = planPageUpdate({
      pages: [current],
      nextPage: page('home', [link('/other')]),
      focusedPageId: 'detail',
      focusedLinks: scannedLinks,
    })
    assert.equal(nonFocused.focusedLinks, scannedLinks)
    assert.equal(nonFocused.action, 'render')

    assert.equal(planPageUpdate({
      pages: [current],
      nextPage: page('missing', []),
      focusedLinks: [],
    }), undefined)
  } finally {
    await server.close()
  }
})
