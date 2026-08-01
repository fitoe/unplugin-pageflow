import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
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
assert.doesNotMatch(clientModule, /style\.css/)
assert.match(runtimeModule, /\/dist\/runtime\/client\.js/)
assert.doesNotMatch(clientModule, /file:\/\//)
assert.doesNotMatch(runtimeModule, /file:\/\//)
await access('src/client/mount.ts')
await access('src/runtime/client.ts')
await access('dist/style.css')
await access('dist/runtime/state.js')
await access('dist/runtime/state.d.ts')
await access('dist/nuxt/index.js')
await access('dist/nuxt/index.d.ts')
await access('dist/astro/index.js')
await access('dist/astro/index.d.ts')
for (const adapter of ['react-router', 'sveltekit', 'solid-start', 'next', 'qwik-city']) {
  await access(`dist/${adapter}/index.js`)
  await access(`dist/${adapter}/index.d.ts`)
}
const clientOutput = await readFile('dist/client/mount.js', 'utf8')
const pluginOutput = await readFile('dist/plugin/index.js', 'utf8')
const packageManifest = JSON.parse(await readFile('package.json', 'utf8'))
assert.equal(packageManifest.exports['./source'].import, './src/plugin/index.ts')
assert.equal(packageManifest.exports['.'].import, './dist/plugin/index.js')
assert.equal(packageManifest.exports['./nuxt'].import, './dist/nuxt/index.js')
assert.equal(packageManifest.exports['./astro'].import, './dist/astro/index.js')
for (const adapter of ['react-router', 'sveltekit', 'solid-start', 'next', 'qwik-city']) {
  assert.equal(packageManifest.exports[`./${adapter}`].import, `./dist/${adapter}/index.js`)
}
assert.equal(packageManifest.bin['pageflow-next'], './dist/next/index.js')
assert.match(await readFile('dist/next/index.js', 'utf8'), /^#!\/usr\/bin\/env node/)
const packagedAssets = await readdir('dist/assets').catch((error) => {
  if (error.code === 'ENOENT') return []
  throw error
})
assert.deepEqual(packageManifest.dependencies, {
  '@nuxt/ui': '^4.10.0',
  'axe-core': '^4.12.1',
  'chrome-launcher': '^1.2.1',
  lighthouse: '^13.4.1',
  'puppeteer-core': '^25.4.0',
  tailwindcss: '^4.3.3',
  unplugin: '^2.3.5',
})
assert.match(clientOutput, /origin\.createCanvas/)
assert.doesNotMatch(clientOutput, /from\s*["']vue["']/)
assert.match(clientOutput, /leafer-canvas-view/)
assert.match(clientOutput, /zoomLayer/)
assert.match(clientOutput, /viewport/)
assert.match(clientOutput, /image\/webp/)
assert.match(clientOutput, /EventSource/)
assert.match(clientOutput, /unplugin-pageflow:page-update/)
assert.match(clientOutput, /unplugin-pageflow:preview-mode/)
assert.doesNotMatch(clientOutput, /new URL\([^)]*layout\.worker/)
assert.match(pluginOutput, /style\.css/)
assert.doesNotMatch(clientOutput, /["']\/assets\/layout\.worker-/)
assert(!packagedAssets.some(file => /^layout\.worker-.*\.js$/.test(file)))
console.log('Built package exposes unplugin adapters and resolves its client assets.')
