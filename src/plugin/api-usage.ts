import { readFile, stat } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

/** Code references are evidence, not proof that a response field flows to a binding. */
export async function inspectApiUsage(root: string, entry: string) {
  const references: Array<{ field: string, expression: string, file: string, line: number, usage: string }> = []
  const interfaces: Array<{ url: string, file: string, line: number }> = []
  const visited = new Set<string>()
  const pending = [resolve(root, entry)]
  const autoImports = new Map<string, string>()
  for (const declaration of ['src/auto-imports.d.ts', 'auto-imports.d.ts']) {
    try {
      const path = resolve(root, declaration)
      const content = await readFile(path, 'utf8')
      for (const match of content.matchAll(/const\s+(\w+):\s*typeof import\(['"](\.[^'"]+)['"]\)/g))
        autoImports.set(match[1]!, resolve(dirname(path), match[2]!))
    } catch { /* Auto imports are optional. */ }
  }
  while (pending.length && visited.size < 40) {
    const file = pending.shift()!
    const local = relative(root, file)
    if (visited.has(file) || local.startsWith('..') || isAbsolute(local) || local.includes('node_modules')) continue
    visited.add(file)
    let source: string
    try {
      if ((await stat(file)).size > 500_000) continue
      source = await readFile(file, 'utf8')
    } catch { continue }
    const lines = source.split('\n')
    lines.forEach((text, index) => {
      if (/^\s*(?:\/\/|\*|<!--)/.test(text)) return
      const usage = /v-if|v-show|\bif\s*\(|\?|computed\(/.test(text) ? '条件 / 计算'
        : /navigate|redirect|@click|@tap|submit|router\./i.test(text) ? '交互 / 参数'
          : /v-model|:value/.test(text) ? '表单绑定'
            : /\{\{|:src|:title|:label/.test(text) ? '页面展示' : '代码引用'
      for (const match of text.matchAll(/\b([A-Za-z_$][\w$]*(?:(?:\?\.|\.)[A-Za-z_$][\w$]*)+)/g)) {
        if (references.length >= 3000) break
        const expression = match[1]!
        references.push({ field: expression.split('.').at(-1)!, expression, file: local.replaceAll('\\', '/'), line: index + 1, usage })
      }
      for (const match of text.matchAll(/(?:url\s*:|\b(?:get|post|put|delete|patch|fetch)\s*\()\s*['"`]([^'"`]+)['"`]/gi)) {
        if (/^\/?pages\//.test(match[1]!)) continue
        if (interfaces.length < 200) interfaces.push({ url: match[1]!, file: local.replaceAll('\\', '/'), line: index + 1 })
      }
    })
    for (const [name, base] of autoImports) {
      if (!new RegExp(`\\b${name}\\s*\\(`).test(source)) continue
      for (const suffix of ['', '.ts', '.js', '/index.ts']) {
        try { if ((await stat(base + suffix)).isFile()) { pending.push(base + suffix); break } } catch { /* Try next extension. */ }
      }
    }
    for (const match of source.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)) {
      const specifier = match[1]!
      const base = specifier.startsWith('.') ? resolve(dirname(file), specifier)
        : specifier.startsWith('@/') || specifier.startsWith('~/') ? resolve(root, 'src', specifier.slice(2)) : undefined
      if (!base) continue
      for (const suffix of ['', '.ts', '.js', '.vue', '/index.ts', '/index.js']) {
        try { if ((await stat(base + suffix)).isFile()) { pending.push(base + suffix); break } } catch { /* Try next extension. */ }
      }
    }
  }
  return { references, interfaces, limited: pending.length > 0 }
}
