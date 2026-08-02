import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('detects a fixed design canvas scaled into the PC viewport', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { detectScaledPreviewSize } = await server.ssrLoadModule('/src/client/preview-size.ts')
    const window = new Window()
    const canvas = window.document.createElement('main')
    canvas.style.cssText = 'width: 3840px; height: 1080px; transform: scale(0.5)'
    window.document.body.append(canvas)
    Object.defineProperties(canvas, {
      clientWidth: { value: 3840 },
      clientHeight: { value: 1080 },
      getBoundingClientRect: { value: () => ({ width: 1920, height: 540 }) },
    })

    assert.deepEqual(detectScaledPreviewSize(window.document, { width: 1920, height: 985 }), { width: 3840, height: 1080 })
  } finally {
    await server.close()
  }
})
