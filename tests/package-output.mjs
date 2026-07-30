import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import PageFlow from '../dist/plugin/index.js'

assert.equal(typeof PageFlow.vite, 'function')
assert.equal(typeof PageFlow.rollup, 'function')
assert.equal(typeof PageFlow.webpack, 'function')

const plugin = PageFlow.vite()
const clientId = await plugin.resolveId('virtual:unplugin-pageflow/client')
const runtimeId = await plugin.resolveId('virtual:unplugin-pageflow/runtime')
const clientModule = await plugin.load(clientId)
const runtimeModule = await plugin.load(runtimeId)

assert.match(clientModule, /\/dist\/client\/mount\.js/)
assert.match(clientModule, /\/dist\/style\.css/)
assert.match(runtimeModule, /\/dist\/runtime\/client\.js/)
assert.doesNotMatch(clientModule, /file:\/\//)
assert.doesNotMatch(runtimeModule, /file:\/\//)
await access('src/client/mount.ts')
await access('src/runtime/client.ts')
await access('dist/style.css')
console.log('Built package exposes unplugin adapters and resolves its client assets.')
