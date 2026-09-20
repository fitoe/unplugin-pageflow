import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('应用跳转不重载内嵌页面，预览热点仍能打开目标地址', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { navigatePreviewFrame } = await server.ssrLoadModule('/src/client/preview.ts')
    const origin = 'http://localhost:2456'
    const login = origin + '/#/pages/auth/login/index'
    const target = '/#/pages/machinery/operator/home/index'
    const frame = { src: login, contentWindow: { location: { href: login } } }
    assert.equal(navigatePreviewFrame(frame, target, origin, false), false)
    assert.equal(frame.src, login)
    assert.equal(navigatePreviewFrame(frame, target, origin, true), true)
    assert.equal(frame.src, origin + target)
    frame.contentWindow.location.href = origin + target
    assert.equal(navigatePreviewFrame(frame, target, origin, true), false)
  } finally {
    await server.close()
  }
})
