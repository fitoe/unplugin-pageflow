import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('Windows 编辑器命令可处理空格和特殊字符', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { windowsEditorLaunchCommand } = await server.ssrLoadModule('/src/plugin/editor.ts')
    assert.equal(
      windowsEditorLaunchCommand(['code', '--reuse-window'], 'C:\\My Project\\A&B.vue'),
      'code --reuse-window ^"C:\\My Project\\A^&B.vue^"',
    )
  } finally {
    await server.close()
  }
})
