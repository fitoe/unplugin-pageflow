import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('falls back to execCommand when Clipboard API is unavailable', async () => {
  const window = new Window({ url: 'http://192.168.1.2/' })
  let copied = ''
  window.document.execCommand = (command) => {
    if (command !== 'copy') return false
    copied = window.document.activeElement?.value ?? window.document.querySelector('textarea')?.value ?? ''
    return true
  }
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { writeClipboardText } = await server.ssrLoadModule('/src/client/clipboard.ts')
    assert.equal(await writeClipboardText('/pages/login', window.document, {}), true)
    assert.equal(copied, '/pages/login')
    assert.equal(window.document.querySelector('textarea'), null)
  } finally {
    await server.close()
    await window.happyDOM.close()
  }
})
