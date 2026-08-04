import { createHash, createPublicKey } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const [keyPath, manifestPath, outputPath] = process.argv.slice(2)

if (!keyPath || !manifestPath || !outputPath) {
  console.error('Usage: node scripts/generate-chrome-update.mjs <key.pem> <manifest.json> <updates.xml>')
  process.exit(1)
}

const privateKey = readFileSync(resolve(keyPath), 'utf8')
const publicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
const extensionId = [...createHash('sha256').update(publicKey).digest().subarray(0, 16)]
  .map(byte => `${String.fromCharCode(97 + (byte >> 4))}${String.fromCharCode(97 + (byte & 15))}`)
  .join('')
const { version } = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'))
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="${extensionId}">
    <updatecheck codebase="https://fitoe.github.io/unplugin-pageflow/chrome/pageflow.crx" version="${version}" />
  </app>
</gupdate>
`

mkdirSync(dirname(resolve(outputPath)), { recursive: true })
writeFileSync(resolve(outputPath), xml)
console.log(`Generated update manifest for ${extensionId} v${version}`)
