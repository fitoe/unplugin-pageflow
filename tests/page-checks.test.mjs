import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('checks page entries, links, self-links, and test coverage', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { createPageChecks, isOrphanPage } = await server.ssrLoadModule('/src/client/page-checks.ts')
    const pages = [
      { id: 'home', path: '/', title: '首页', links: [{ label: '详情', to: '/detail' }] },
      { id: 'detail', path: '/detail', title: '详情', links: [
        { label: '自己', to: '/detail' },
        { label: '丢失页面', to: '/missing' },
        { label: '外部帮助', to: 'https://example.com/help' },
      ] },
      { id: 'orphan', path: '/orphan', title: '孤立页面', links: [{ label: '自己', to: '/orphan' }] },
    ]
    const checks = createPageChecks(pages[1], pages, [{ id: 'test', name: '详情测试' }])
    assert.deepEqual(Object.fromEntries(checks.map(item => [item.id, item.status])), {
      entry: 'passed',
      links: 'failed',
      'self-links': 'failed',
      tests: 'passed',
    })
    const orphanChecks = createPageChecks(pages[2], pages, [])
    assert.equal(orphanChecks.find(item => item.id === 'entry').status, 'uncovered')
    assert.equal(orphanChecks.find(item => item.id === 'tests').status, 'uncovered')
    assert.equal(createPageChecks(pages[0], pages, []).find(item => item.id === 'entry').status, 'passed')
    assert.equal(isOrphanPage(pages[0], pages), false)
    assert.equal(isOrphanPage(pages[1], pages), false)
    assert.equal(isOrphanPage(pages[2], pages), true)
  } finally {
    await server.close()
  }
})
