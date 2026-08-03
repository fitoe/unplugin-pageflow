import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PageFlowTestCommand, PageFlowTestKind } from '../shared/types.ts'

export function inferTestCommands(root: string, configured: Partial<Record<PageFlowTestKind, PageFlowTestCommand>>) {
  const commands = { ...configured }
  let packageJson: { dependencies?: Record<string, string>, devDependencies?: Record<string, string> }
  try {
    packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  } catch {
    return commands
  }

  const hasVitest = Boolean(packageJson.dependencies?.vitest || packageJson.devDependencies?.vitest)
  const vitestEntry = resolve(root, 'node_modules/vitest/vitest.mjs')
  if (!hasVitest || !existsSync(vitestEntry)) return commands

  const vitest: PageFlowTestCommand = {
    command: process.execPath,
    args: [vitestEntry, 'run', '{file}', '-t', '{name}'],
  }
  commands.unit ??= vitest
  commands.component ??= vitest
  return commands
}
