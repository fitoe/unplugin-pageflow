import assert from 'node:assert/strict'
import test from 'node:test'
import { Window } from 'happy-dom'
import { createServer } from 'vite'

test('unplugin graph converts to the shared host state', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const { graphToHostState } = await server.ssrLoadModule('/src/client/unplugin-host.ts')
    const config = {
      appUrl: '/app/', dynamicParams: {}, previewRoles: [],
    }
    const state = graphToHostState({
      routeMode: 'history', version: 1,
      pages: [
        { id: 'home', path: '/', title: '首页', accent: '#fff', links: [{ label: '详情', to: '/detail' }] },
        { id: 'detail', path: '/detail', title: '详情', accent: '#fff', links: [] },
      ],
    }, config, [], 'http://pageflow.test')

    assert.deepEqual(state.pages.map(page => page.url), [
      'http://pageflow.test/app/?__unplugin-pageflow_preview=1',
      'http://pageflow.test/app/detail?__unplugin-pageflow_preview=1',
    ])
    assert.equal(state.edges.length, 1)
    assert.equal(state.edges[0].from, state.pages[0].url)
    assert.equal(state.edges[0].to, state.pages[1].url)
  } finally {
    await server.close()
  }
})

test('unplugin form commands clone reactive values before crossing the iframe boundary', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  try {
    const window = new Window({ url: 'http://pageflow.test/__unplugin-pageflow/' })
    Object.assign(globalThis, { window, localStorage: window.localStorage })
    const { UnpluginPageFlowHost } = await server.ssrLoadModule('/src/client/unplugin-host.ts')
    let sentMessage
    const contentWindow = {
      postMessage(message) {
        sentMessage = structuredClone(message)
        window.queueMicrotask(() => window.dispatchEvent(new window.MessageEvent('message', {
          origin: window.location.origin,
          source: contentWindow,
          data: {
            type: 'unplugin-pageflow:form-result',
            requestId: message.requestId,
            action: message.action,
            result: { applied: ['field'], skipped: [], missing: [], errors: [], canUndo: true },
          },
        })))
      },
    }
    const host = new UnpluginPageFlowHost({
      config: {},
      getFrame: () => ({ contentWindow }),
      capture: async () => '',
    })
    const reactiveValues = new Proxy({ field: 'PageFlow test' }, {})
    const result = await host.fillForm(reactiveValues)
    assert.deepEqual(sentMessage.values, { field: 'PageFlow test' })
    assert.equal(result.applied[0], 'field')
    window.close()
  } finally {
    await server.close()
  }
})
