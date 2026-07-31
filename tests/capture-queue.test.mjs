import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('serializes capture scheduling and releases completion waiters', async () => {
  const timers = new Map()
  const idleCallbacks = new Map()
  let nextId = 1
  const host = {
    setTimeout(callback) {
      const id = nextId++
      timers.set(id, () => {
        timers.delete(id)
        callback()
      })
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    },
    requestIdleCallback(callback) {
      const id = nextId++
      idleCallbacks.set(id, () => {
        idleCallbacks.delete(id)
        callback()
      })
      return id
    },
    cancelIdleCallback(id) {
      idleCallbacks.delete(id)
    },
  }
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { CaptureQueue } = await server.ssrLoadModule('/src/client/capture-queue.ts')
    const queue = new CaptureQueue(host)
    let runs = 0
    assert.equal(queue.schedule(100, true, () => { runs++ }), true)
    assert.equal(queue.schedule(100, true, () => { runs++ }), false)
    assert.equal(queue.scheduled, true)
    timers.values().next().value()
    assert.equal(runs, 0)
    idleCallbacks.values().next().value()
    assert.equal(runs, 1)
    assert.equal(queue.scheduled, false)

    let completed = false
    const completion = queue.waitFor('home', 1000).then(() => { completed = true })
    queue.complete('home')
    await completion
    assert.equal(completed, true)

    queue.schedule(100, true, () => { runs++ })
    queue.cancel()
    assert.equal(queue.scheduled, false)
    queue.dispose()
    assert.equal(timers.size, 0)
    assert.equal(idleCallbacks.size, 0)
  } finally {
    await server.close()
  }
})
