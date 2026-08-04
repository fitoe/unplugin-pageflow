import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('owns Chrome host loading and routes host events to UI callbacks', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { startPageFlowHostSession } = await server.ssrLoadModule('/src/client/host-session.ts')
    const state = { currentUrl: 'https://example.com/a', pages: [], edges: [], requests: [], diagnostics: [] }
    let listener
    let stopped = false
    const host = {
      loadState: async () => state,
      loadStorage: async () => undefined,
      subscribe: next => { listener = next; return () => { stopped = true } },
    }
    const received = { states: 0, requests: 0, diagnostics: 0 }
    const session = await startPageFlowHostSession(host, {
      onState: () => { received.states++ },
      onRequest: () => { received.requests++ },
      onDiagnostics: () => { received.diagnostics++ },
    })
    assert.equal(session.origin, 'https://example.com')
    listener({ kind: 'request', request: {} })
    listener({ kind: 'diagnostics', diagnostics: [] })
    listener({ kind: 'page', page: {} })
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.deepEqual(received, { states: 1, requests: 1, diagnostics: 1 })
    session.stop()
    assert.equal(stopped, true)
  } finally {
    await server.close()
  }
})
