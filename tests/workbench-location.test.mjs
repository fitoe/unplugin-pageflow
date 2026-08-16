import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('workbench state round-trips through a shareable hash', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { buildWorkbenchHash, parseWorkbenchHash } = await server.ssrLoadModule('/src/client/workbench-location.ts')
    const state = {
      pagePath: '/pages/inspection/home/index?tab=today',
      groupPath: [],
      viewport: 'mobile',
      user: 'inspection',
      panel: 'diagnostics',
      view: 'table',
    }
    const hash = buildWorkbenchHash(state)
    assert.equal(hash, '#/page/%2Fpages%2Finspection%2Fhome%2Findex%3Ftab%3Dtoday?viewport=mobile&user=inspection&panel=diagnostics&view=table')
    assert.deepEqual(parseWorkbenchHash(hash), state)
    assert.deepEqual(parseWorkbenchHash('#/group/inspection%2Freport?viewport=pc'), {
      pagePath: undefined,
      groupPath: ['inspection', 'report'],
      viewport: 'pc',
      user: undefined,
      panel: undefined,
      view: 'canvas',
    })
  } finally {
    await server.close()
  }
})

test('page tree panel is accepted in workbench links', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { buildWorkbenchHash, parseWorkbenchHash } = await server.ssrLoadModule('/src/client/workbench-location.ts')
    const hash = buildWorkbenchHash({ pagePath: '/checkout', groupPath: [], panel: 'tree' })
    assert.equal(hash, '#/page/%2Fcheckout?panel=tree')
    assert.equal(parseWorkbenchHash(hash).panel, 'tree')
  } finally {
    await server.close()
  }
})
