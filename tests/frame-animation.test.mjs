import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('runs one frame animation at a time and cancels stale completion', async () => {
  const callbacks = new Map()
  let nextId = 1
  let now = 0
  const host = {
    now: () => now,
    requestAnimationFrame(callback) {
      const id = nextId++
      callbacks.set(id, callback)
      return id
    },
    cancelAnimationFrame(id) {
      callbacks.delete(id)
    },
  }
  const runNext = time => {
    now = time
    const [id, callback] = callbacks.entries().next().value
    callbacks.delete(id)
    callback(time)
  }
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { FrameAnimation } = await server.ssrLoadModule('/src/client/frame-animation.ts')
    const animation = new FrameAnimation(host)
    const progress = []
    let completed = 0
    animation.start(100, value => progress.push(value), () => { completed++ })
    runNext(50)
    runNext(100)
    assert.deepEqual(progress, [0.5, 1])
    assert.equal(completed, 1)
    assert.equal(animation.running, false)

    animation.start(100, () => {}, () => { completed++ })
    animation.start(100, () => {}, () => { completed += 10 })
    assert.equal(callbacks.size, 1)
    animation.cancel()
    assert.equal(callbacks.size, 0)
    assert.equal(completed, 1)
  } finally {
    await server.close()
  }
})
