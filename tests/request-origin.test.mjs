import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import { createServer } from 'vite'

test('rejects cross-origin mutations before any PageFlow API side effects', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'pageflow-origin-'))
  await mkdir(resolve(root, 'src'))
  const original = JSON.stringify({ enabled: true, previewPath: '/review/', groupNames: {} })
  await writeFile(resolve(root, '.pageflow'), original)
  const server = await createServer({ root, configFile: resolve('vite.config.ts'), logLevel: 'silent', server: { host: '127.0.0.1', port: 0, hmr: false } })
  try {
    await server.listen()
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`
    for (const headers of [
      { Origin: 'https://untrusted.example', 'Content-Type': 'text/plain' },
      { Origin: 'null', 'Content-Type': 'application/json' },
      { Origin: origin.replace('127.0.0.1', 'localhost') },
      { 'Sec-Fetch-Site': 'cross-site' },
      { 'Sec-Fetch-Site': 'same-site' },
      { Referer: 'https://untrusted.example/page' },
    ]) {
      for (const endpoint of ['group-name', 'page-tree-placement', 'tests/run', 'editor', 'config']) {
        const response = await fetch(`${origin}/review/api/${endpoint}`, {
          method: 'POST', headers, body: JSON.stringify({ key: 'probe', name: 'changed' }),
        })
        assert.equal(response.status, 403, `${endpoint}: ${JSON.stringify(headers)}`)
      }
    }
    const deletion = await fetch(`${origin}/review/api/figma-page`, { method: 'DELETE', headers: { Origin: 'https://untrusted.example' } })
    assert.equal(deletion.status, 403)
    assert.equal(await readFile(resolve(root, '.pageflow'), 'utf8'), original)

    for (const headers of [{ Origin: origin, 'Sec-Fetch-Site': 'same-origin' }, {}]) {
      const response = await fetch(`${origin}/review/api/group-name`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'probe', name: 'allowed' }),
      })
      assert.equal(response.status, 200)
    }
    assert.equal(JSON.parse(await readFile(resolve(root, '.pageflow'), 'utf8')).groupNames.probe, 'allowed')
  } finally {
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
})

test('compares complete origins for HTTP, HTTPS and IPv6 while preserving read requests', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' })
  try {
    const { isAllowedPageFlowRequest: allowed } = await server.ssrLoadModule('/src/plugin/request-origin.ts')
    assert(allowed({ host: 'localhost:5173', origin: 'https://localhost:5173' }, 'POST', true))
    assert(allowed({ host: '[::1]:5173', origin: 'http://[::1]:5173' }, 'POST'))
    assert(allowed({ host: 'localhost', referer: 'http://localhost/page' }, 'POST'))
    for (const origin of ['null', 'garbage', 'http://localhost:5174', 'https://localhost:5173', 'http://localhost:5173.evil.test']) {
      assert.equal(allowed({ host: 'localhost:5173', origin }, 'POST'), false)
    }
    assert.equal(allowed({ origin: 'http://localhost' }, 'POST'), false)
    assert(allowed({ origin: 'https://untrusted.example' }, 'GET'))
    assert(allowed({}, 'POST')) // Local tools do not send browser origin headers.
  } finally { await server.close() }
})
