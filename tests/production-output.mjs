import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve('playground/basic/dist')

async function readOutput(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const contents = await Promise.all(entries.map(entry => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? readOutput(path) : readFile(path, 'utf8')
  }))
  return contents.flat().join('\n')
}

const output = await readOutput(outputDirectory)
assert.doesNotMatch(output, /__unplugin-pageflow|virtual:unplugin-pageflow|unplugin-pageflow:navigate/)
console.log('Production playground contains no unplugin-pageflow runtime code.')
