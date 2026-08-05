import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function formatPageFlowVersion(packageVersion, revision) {
  const core = packageVersion.split('-', 1)[0]
  if (!/^\d+\.\d+\.\d+$/.test(core)) throw new Error(`Invalid PageFlow package version: ${packageVersion}`)
  if (!Number.isInteger(revision) || revision < 0 || revision > 65_535) throw new Error(`Invalid PageFlow revision: ${revision}`)
  return `${core}.${revision}`
}

export function resolvePageFlowVersion() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
  let revision = 0
  try {
    revision = Number(execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim())
  } catch {}
  return formatPageFlowVersion(packageVersion, revision)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(resolvePageFlowVersion())
