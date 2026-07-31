import { readFile, writeFile } from 'node:fs/promises'

const file = new URL('../dist/next/index.js', import.meta.url)
const source = await readFile(file, 'utf8')
if (!source.startsWith('#!/usr/bin/env node\n'))
  await writeFile(file, `#!/usr/bin/env node\n${source}`)
