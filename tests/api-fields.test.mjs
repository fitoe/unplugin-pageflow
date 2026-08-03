import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('业务接口字段分批提取并限制最大数量', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { collectApiFields } = await server.ssrLoadModule('/src/runtime/api-fields.ts')
    let yields = 0
    const fields = await collectApiFields({ name: '水稻', rows: [{ value: 1 }, { value: 2 }], ignored: 3 }, '水稻 2', {
      maximumFields: 4,
      yieldEvery: 2,
      yieldToHost: async () => { yields++ },
    })
    assert.deepEqual(fields, [
      { path: 'name', value: '水稻', used: true },
      { path: 'rows[0].value', value: 1, used: false },
      { path: 'rows[1].value', value: 2, used: true },
      { path: 'ignored', value: 3, used: false },
    ])
    assert.ok(yields > 0)
  } finally {
    await server.close()
  }
})
