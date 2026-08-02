import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('分组页面更新先指向首图，进入分组后指向真实页面', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { pageUpdateEffectTarget } = await server.ssrLoadModule('/src/client/page-update-effect.ts')
    const pages = [
      { id: 'products-index', path: '/products/index', title: 'Products', links: [] },
      { id: 'products-edit', path: '/products/edit', title: 'Edit product', links: [] },
    ]
    const grouped = pageUpdateEffectTarget(pages, [], 'products-edit')
    assert.equal(grouped.grouped, true)
    assert.equal(grouped.page.id, 'products-index')

    const revealed = pageUpdateEffectTarget(pages, ['products'], 'products-edit')
    assert.equal(revealed.grouped, false)
    assert.equal(revealed.page.id, 'products-edit')
  } finally {
    await server.close()
  }
})
