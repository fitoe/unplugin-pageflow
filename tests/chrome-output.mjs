import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { resolvePageFlowVersion } from '../scripts/pageflow-version.mjs'

const output = resolve('packages/chrome-extension/.output/chrome-mv3')

async function outputFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(async entry => entry.isDirectory()
    ? outputFiles(resolve(directory, entry.name))
    : [resolve(directory, entry.name)]))).flat()
}

const files = await outputFiles(output)
const sizes = new Map(await Promise.all(files.map(async file => [file, (await stat(file)).size])))
const total = [...sizes.values()].reduce((sum, size) => sum + size, 0)
const pageRuntime = [...sizes].find(([file]) => file.endsWith('content-scripts\\page-runtime.js') || file.endsWith('content-scripts/page-runtime.js'))
const panel = [...sizes].find(([file]) => /[/\\]chunks[/\\]panel-[^/\\]+\.js$/.test(file))
const manifest = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'))

assert.equal(manifest.version, resolvePageFlowVersion())
assert(pageRuntime, 'Chrome page runtime output is missing')
assert(panel, 'Chrome panel output is missing')
assert(pageRuntime[1] < 100_000, `Chrome page runtime regressed to ${pageRuntime[1]} bytes`)
assert(panel[1] < 1_000_000, `Chrome panel regressed to ${panel[1]} bytes`)
assert(total < 1_500_000, `Chrome extension regressed to ${total} bytes`)
console.log(`Chrome output verified: ${(total / 1_000_000).toFixed(2)} MB total, ${(pageRuntime[1] / 1000).toFixed(1)} kB runtime.`)
