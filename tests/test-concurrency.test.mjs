import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('页面测试最多按指定并发数运行并支持停止后续任务', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { runWithConcurrency } = await server.ssrLoadModule('/src/client/test-concurrency.ts')
    let active = 0
    let maximum = 0
    let stopped = false
    const completed = []
    await runWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      active++
      maximum = Math.max(maximum, active)
      await new Promise(resolve => setTimeout(resolve, item === 2 ? 1 : 10))
      completed.push(item)
      active--
      if (item === 2) stopped = true
    }, () => stopped)

    assert.equal(maximum, 2)
    assert.deepEqual(completed.sort(), [1, 2])
  } finally {
    await server.close()
  }
})
