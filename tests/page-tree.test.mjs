import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('page tree preserves route groups, custom names, and expansion', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const tree = await server.ssrLoadModule('/src/client/page-tree.ts')
    const pages = [
      { id: 'home', title: 'Home', path: '/', accent: '#000', links: [] },
      { id: 'orders', title: 'Orders', path: '/commerce/orders', accent: '#000', links: [] },
      { id: 'order-detail', title: 'Order detail', path: '/commerce/orders/detail', accent: '#000', links: [] },
      { id: 'settings', title: 'Settings', path: '/account/settings', accent: '#000', links: [], virtual: true },
    ]
    const paths = {
      home: [],
      orders: ['commerce'],
      'order-detail': ['commerce', 'orders'],
      settings: ['account'],
    }
    const nodes = tree.createPageTree(pages, {
      groupNames: { commerce: '交易', 'commerce/orders': '订单中心' },
      pageNames: { '/commerce/orders/detail': '订单详情' },
      orphanPageIds: new Set(['settings']),
      groupPath: page => paths[page.id],
    })

    assert.deepEqual(nodes.map(node => [node.kind, node.label]), [
      ['page', 'Home'],
      ['group', '交易'],
      ['group', '孤岛页面'],
    ])
    assert.equal(nodes[1].pageCount, 2)
    assert.equal(nodes[1].children[1].label, '订单中心')
    assert.equal(nodes[1].children[1].children[0].label, '订单详情')
    assert.equal(nodes[2].children[0].virtual, true)
    assert.equal(nodes[2].navigable, false)
    assert.deepEqual(tree.pageTreeAncestorKeys(nodes, 'order-detail'), ['group:commerce', 'group:commerce/orders'])
    assert.deepEqual(
      tree.flattenPageTree(nodes, new Set(['group:commerce'])).map(row => [row.depth, row.node.label]),
      [[0, 'Home'], [0, '交易'], [1, 'Orders'], [1, '订单中心'], [0, '孤岛页面']],
    )
  } finally {
    await server.close()
  }
})
