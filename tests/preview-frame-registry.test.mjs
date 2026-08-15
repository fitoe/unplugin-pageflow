import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('owns preview frame indexes, cleanups, and debounced timers', async () => {
  const timers = new Map()
  let nextTimer = 1
  const timerHost = {
    setTimeout(callback) {
      const timer = nextTimer++
      timers.set(timer, () => {
        timers.delete(timer)
        callback()
      })
      return timer
    },
    clearTimeout(timer) {
      timers.delete(timer)
    },
  }
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { PreviewFrameRegistry } = await server.ssrLoadModule('/src/client/preview-frame-registry.ts')
    const registry = new PreviewFrameRegistry(timerHost)
    const firstWindow = {}
    const secondWindow = {}
    const firstFrame = { contentWindow: firstWindow }
    const secondFrame = { contentWindow: secondWindow }
    let cleanups = 0
    let refreshes = 0

    assert.equal(registry.set('home', firstFrame), true)
    assert.equal(registry.set('home', firstFrame), false)
    assert.equal(registry.pageIdForSource(firstWindow), 'home')
    assert.equal(registry.set('about', secondFrame), true)
    assert.equal(registry.reassign('home', 'about'), true)
    assert.equal(registry.get('about'), firstFrame)
    assert.equal(registry.pageIdForSource(firstWindow), 'about')
    registry.remove('about')
    assert.equal(registry.get('about'), firstFrame)
    assert.equal(registry.pageIdForSource(secondWindow), undefined)
    assert.equal(registry.restore('home'), true)
    assert.equal(registry.get('about'), undefined)
    assert.equal(registry.pageIdForSource(firstWindow), 'home')
    registry.setCleanup('home', () => { cleanups++ })
    registry.debounce('home', 750, () => { refreshes++ })
    registry.debounce('home', 750, () => { refreshes++ })
    assert.equal(timers.size, 1)

    assert.equal(registry.set('home', secondFrame), true)
    assert.equal(cleanups, 1)
    assert.equal(timers.size, 0)
    assert.equal(registry.pageIdForSource(firstWindow), undefined)
    assert.equal(registry.pageIdForSource(secondWindow), 'home')

    registry.setCleanup('home', () => { cleanups++ })
    registry.debounce('home', 750, () => { refreshes++ })
    const callback = timers.values().next().value
    callback()
    assert.equal(refreshes, 1)
    assert.equal(timers.size, 0)

    registry.debounce('home', 750, () => { refreshes++ })
    registry.remove('home')
    assert.equal(cleanups, 2)
    assert.equal(timers.size, 0)
    assert.equal(registry.get('home'), undefined)

    registry.set('detail', firstFrame)
    registry.setCleanup('detail', () => { cleanups++ })
    registry.debounce('detail', 750, () => { refreshes++ })
    registry.dispose()
    assert.equal(cleanups, 3)
    assert.equal(timers.size, 0)
    assert.equal(registry.get('detail'), undefined)
  } finally {
    await server.close()
  }
})
