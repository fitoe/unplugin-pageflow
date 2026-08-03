import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createServer } from 'vite'

test('检测到本地 Vitest 时自动启用单元和组件测试', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pageflow-test-command-'))
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    await mkdir(join(root, 'node_modules', 'vitest'), { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({ devDependencies: { vitest: '^3.0.0' } }))
    await writeFile(join(root, 'node_modules', 'vitest', 'vitest.mjs'), '')
    const { inferTestCommands } = await server.ssrLoadModule('/src/plugin/test-command.ts')
    const explicit = { command: 'custom-test', args: ['{file}'] }
    const commands = inferTestCommands(root, { component: explicit })

    assert.equal(commands.unit.command, process.execPath)
    assert.deepEqual(commands.unit.args.slice(1), ['run', '{file}', '-t', '{name}'])
    assert.strictEqual(commands.component, explicit)
    assert.equal(commands.e2e, undefined)
  } finally {
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
})
