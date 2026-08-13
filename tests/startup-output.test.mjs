import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import PageFlow from '../src/plugin/index.ts'

test('宿主项目的 Vite 启动地址后显示 PageFlow 画板地址', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pageflow-host-'))
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      PageFlow.vite(),
      {
        name: 'later-url-printer',
        configureServer(server) {
          const printUrls = server.printUrls.bind(server)
          server.printUrls = () => {
            printUrls()
            server.config.logger.info('  ➜  Later inspector')
          }
        },
      },
    ],
  })
  try {
    await server.listen()
    const messages = []
    server.config.logger.info = message => messages.push(String(message))
    server.printUrls()
    const address = server.httpServer?.address()
    assert.ok(address && typeof address === 'object')
    assert.ok(messages.some(message => message.includes(`PageFlow: http://127.0.0.1:${address.port}/__unplugin-pageflow/`)))
    assert.ok(messages.some(message => message.includes('Later inspector')))
  } finally {
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
})

test('PageFlow 项目自身启动时不额外输出画板地址', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [PageFlow.vite()],
  })
  try {
    await server.listen()
    const messages = []
    server.config.logger.info = message => messages.push(String(message))
    server.printUrls()
    assert.equal(messages.some(message => message.includes('PageFlow:')), false)
  } finally {
    await server.close()
  }
})
