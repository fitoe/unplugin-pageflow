import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { chromium } from '@playwright/test'

test('API JSON tree expands nested objects and array entries', async () => {
  const entry = `import { createApp, h } from 'vue';
    import Tree from '/packages/pageflow-ui/src/PageFlowJsonTree.vue';
    createApp({ render: () => h(Tree, { data: { data: { rows: [{ detail: { metadata: { audit: { actor: { name: 'Nested field' } } } } }] } } }) }).mount('#app');`
  const server = await createServer({ configFile: false, appType: 'custom', plugins: [vue(), {
    name: 'tree-fixture',
    resolveId(id) { if (id === '/tree-entry.js') return '\0tree-entry' },
    load(id) { if (id === '\0tree-entry') return entry },
  }], server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' })
  server.middlewares.use('/tree-fixture', (_request, response) => {
    response.setHeader('Content-Type', 'text/html')
    response.end('<div id="app"></div><script type="module" src="/tree-entry.js"></script>')
  })
  let browser
  try {
    await server.listen()
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${server.resolvedUrls.local[0]}tree-fixture`)
    page.setDefaultTimeout(5000)
    await page.getByText('Nested field', { exact: false }).waitFor()
    assert.deepEqual(errors, [])
  } finally {
    await browser?.close()
    await server.close()
  }
})
