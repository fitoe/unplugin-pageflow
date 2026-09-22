import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

test('config transactions preserve concurrent changes, backups and damaged originals', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const directory = await mkdtemp(join(tmpdir(), 'pageflow-config-store-'))
  const file = join(directory, '.pageflow')
  try {
    const store = await server.ssrLoadModule('/src/plugin/config-store.ts')
    await Promise.all(Array.from({ length: 5 }, () => store.ensurePageFlowConfig(file, { pages: {} })))
    const copies = await Promise.all(Array.from({ length: 25 }, () => store.readPageFlowConfig(file)))
    await Promise.all(copies.map((config, index) => {
      config.pages[`/page-${index}`] = { name: `Page ${index}` }
      return store.writePageFlowConfig(file, config)
    }))
    assert.equal(Object.keys(JSON.parse(await readFile(file, 'utf8')).pages).length, 25)
    assert.equal(Object.keys(JSON.parse(await readFile(`${file}.bak`, 'utf8')).pages).length, 24)
    assert.deepEqual((await readdir(directory)).sort(), ['.pageflow', '.pageflow.bak'])

    const first = await store.readPageFlowConfig(file)
    const second = await store.readPageFlowConfig(file)
    first.pages['/page-0'].name = 'First'
    second.pages['/page-0'].name = 'Second'
    await store.writePageFlowConfig(file, first)
    await assert.rejects(store.writePageFlowConfig(file, second), /其他操作修改/)
    assert.equal(JSON.parse(await readFile(file, 'utf8')).pages['/page-0'].name, 'First')

    const pending = await store.readPageFlowConfig(file)
    pending.pages['/page-1'].name = 'Pending'
    const external = JSON.parse(await readFile(file, 'utf8'))
    external.groupNames = { external: '外部编辑' }
    await writeFile(file, JSON.stringify(external))
    await store.writePageFlowConfig(file, pending)
    assert.equal(JSON.parse(await readFile(file, 'utf8')).groupNames.external, '外部编辑')

    const stale = await store.readPageFlowConfig(file)
    stale.pages['/page-2'].name = 'Do not write'
    await writeFile(file, '{broken')
    const backup = await readFile(`${file}.bak`, 'utf8')
    await assert.rejects(store.writePageFlowConfig(file, stale))
    const recovered = await store.readPageFlowConfigWithBackup(file)
    assert.deepEqual(recovered, JSON.parse(backup))
    assert.equal(await readFile(file, 'utf8'), '{broken')
    assert.equal(await readFile(`${file}.bak`, 'utf8'), backup)
  } finally {
    await server.close()
    await rm(directory, { recursive: true, force: true })
  }
})
