import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('Vite 启动地址后显示 PageFlow 控制台地址', async () => {
  const server = await createServer({
    root: process.cwd(),
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  })
  try {
    await server.listen()
    const messages = []
    server.config.logger.info = message => messages.push(String(message))
    server.printUrls()
    const address = server.httpServer?.address()
    assert.ok(address && typeof address === 'object')
    assert.ok(messages.some(message => message.includes(`PageFlow: http://127.0.0.1:${address.port}/__unplugin-pageflow/`)))
  } finally {
    await server.close()
  }
})
