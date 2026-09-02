import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('parses, normalizes, matches, and opens Figma page links', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { extractFigmaLink, figmaLinkForPage, normalizeFigmaPages, openFigmaLink, parseFigmaLink } = await server.ssrLoadModule('/src/client/figma.ts')
    const url = 'https://www.figma.com/design/AbCdEf/PageFlow?node-id=123-456'
    assert.deepEqual(parseFigmaLink(url), {
      browserUrl: url,
      desktopUrl: 'figma://file/AbCdEf?node-id=123-456',
      fileKey: 'AbCdEf',
      nodeId: '123-456',
    })
    assert.equal(parseFigmaLink('https://example.com/design/AbCdEf/PageFlow'), undefined)
    assert.equal(extractFigmaLink(`Implement this design: @[${url}](${url.replace('&', '\\&')})`), 'AbCdEf#123:456')
    assert.equal(extractFigmaLink('Figma: AbCdEf#123:456'), 'AbCdEf#123:456')
    assert.equal(extractFigmaLink('https://www.figma.com/design/AbCdEf/PageFlow'), undefined)

    const mappings = normalizeFigmaPages({
      '/orders/:id': 'AbCdEf#123:456',
      '/browser': 'AbCdEf#123:456',
      '/invalid': 'javascript:alert(1)',
    }, { '/orders/:id': '订单设计' })
    assert.equal(mappings['/orders/:id'].ref, 'AbCdEf#123:456')
    assert.equal(mappings['/invalid'], undefined)
    const versioned = normalizeFigmaPages({ '/orders/:id': 'AbCdEf#123:456' }, {}, { '/orders/:id': '42' })
    assert.equal(versioned['/orders/:id'].version, '42')
    assert.equal(figmaLinkForPage({ id: 'order-42', path: '/orders/42?tab=detail' }, mappings)?.label, '订单设计')
    assert.equal(figmaLinkForPage({ id: 'https://app.test/orders/42', path: 'https://app.test/orders/42?tab=detail' }, mappings)?.label, '订单设计')

    const opened = []
    assert.equal(openFigmaLink(mappings['/orders/:id'], (...args) => opened.push(args)), true)
    assert.deepEqual(opened[0], ['figma://file/AbCdEf?node-id=123-456', '_blank'])
    openFigmaLink(mappings['/browser'], (...args) => opened.push(args))
    assert.deepEqual(opened[1], ['figma://file/AbCdEf?node-id=123-456', '_blank'])
  } finally {
    await server.close()
  }
})
