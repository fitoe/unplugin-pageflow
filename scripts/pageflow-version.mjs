import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function formatPageFlowVersion(packageVersion, revision) {
  const core = packageVersion.split('-', 1)[0]
  if (!/^\d+\.\d+\.\d+$/.test(core)) throw new Error(`Invalid PageFlow package version: ${packageVersion}`)
  if (!Number.isInteger(revision) || revision < 0 || revision > 65_535) throw new Error(`Invalid PageFlow revision: ${revision}`)
  return `${core}.${revision}`
}

export function latestPageFlowBaseVersion(packageVersion, tags = []) {
  const versions = [packageVersion, ...tags]
    .map(value => value.replace(/^v/, '').split('-', 1)[0])
    .filter(value => /^\d+\.\d+\.\d+$/.test(value))
  if (!versions.length) throw new Error(`Invalid PageFlow package version: ${packageVersion}`)
  return versions.sort((left, right) => {
    const a = left.split('.').map(Number)
    const b = right.split('.').map(Number)
    return b[0] - a[0] || b[1] - a[1] || b[2] - a[2]
  })[0]
}

export function resolvePageFlowVersion() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
  let revision = 0
  let tags = []
  try {
    revision = Number(execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim())
    tags = execFileSync('git', ['tag', '--list', 'v[0-9]*'], { cwd: root, encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean)
  } catch {}
  return formatPageFlowVersion(latestPageFlowBaseVersion(packageVersion, tags), revision)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(resolvePageFlowVersion())
