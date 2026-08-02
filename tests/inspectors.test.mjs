import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('runs registered inspectors in isolation and supports disposal', async () => {
  const browser = new Window({ url: 'http://localhost/example' })
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { pageFlowInspectorRevision, registerPageFlowInspector, runPageFlowInspectors } = await server.ssrLoadModule('/src/runtime/inspectors.ts')
    const initialRevision = pageFlowInspectorRevision()
    const dispose = registerPageFlowInspector({
      id: 'example',
      async inspect(context) {
        assert.equal(context.location.pathname, '/example')
        return [{ ruleId: 'example-rule', severity: 'suggestion', category: 'visual', title: 'Example', description: 'Example issue' }]
      },
    })
    registerPageFlowInspector({ id: 'broken', inspect() { throw new Error('broken inspector') } })
    assert.equal(pageFlowInspectorRevision(), initialRevision + 2)

    const diagnostics = await runPageFlowInspectors({ document: browser.document, location: browser.location })
    assert.deepEqual(diagnostics.map(item => [item.id, item.source, item.ruleId]), [
      ['inspector:example:example-rule:0', 'example', 'example-rule'],
      ['inspector:broken:error', 'broken', 'inspector-error'],
    ])
    assert.equal(dispose(), true)
    assert.equal(pageFlowInspectorRevision(), initialRevision + 3)
    assert.equal((await runPageFlowInspectors({ document: browser.document, location: browser.location })).some(item => item.source === 'example'), false)
  } finally {
    await server.close()
    browser.close()
  }
})
