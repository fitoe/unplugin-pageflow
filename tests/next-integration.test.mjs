import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { resolveNextRoutes } from '../dist/next/index.js'

test('maps Next App and Pages Router files', () => {
  const routes = resolveNextRoutes(resolve('tests/fixtures/next'))
  assert.deepEqual(routes.map(route => route.path), [
    '/',
    '/about',
    '/contact',
    '/docs/:slug*',
    '/products/:id',
  ])
})

test('serves a real Next app with runtime injection and an initialized graph', { timeout: 60_000 }, async () => {
  const child = spawn(process.execPath, [
    resolve('dist/next/index.js'),
    '--dir', resolve('tests/fixtures/next'),
    '--host', '127.0.0.1',
    '--port', '24685',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PAGEFLOW_NEXT_DIST_DIR: `.next-pageflow-${process.pid}` },
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  try {
    let response
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        response = await fetch('http://127.0.0.1:24685/')
        if (response.ok) break
      } catch {}
      await new Promise(resolveWait => setTimeout(resolveWait, 500))
    }
    assert.ok(response?.ok, `Next fixture did not start:\n${output}`)
    const html = await response.text()
    assert.match(html, /Next home/)
    assert.match(html, /import '\/@id\/virtual:unplugin-pageflow\/runtime'/)
    assert.match(html, /\/about\?from=home/)
    const graph = await fetch('http://127.0.0.1:24685/__unplugin-pageflow/api/graph').then(response => response.json())
    assert.deepEqual(graph.pages.map(page => page.path), ['/', '/about', '/contact', '/docs/:slug*', '/products/:id'])
  } finally {
    child.kill('SIGTERM')
    await Promise.race([
      once(child, 'exit'),
      new Promise(resolveWait => setTimeout(resolveWait, 5_000)).then(() => child.kill('SIGKILL')),
    ])
  }
})
