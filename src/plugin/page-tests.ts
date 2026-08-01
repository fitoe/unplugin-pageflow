import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, relative, resolve } from 'node:path'
import type { PageFlowPageTest, PageFlowRuntimeRoute, PageFlowTestSource } from '../shared/types'

const TEST_FILE = /(?:^|[.\-_])(?:test|spec)\.(?:[cm]?[jt]sx?|vue|svelte)$/i
const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist', '.git', '.next', '.nuxt', '.svelte-kit', '.output', 'coverage', '.unplugin-pageflow'])

function shouldSkipDirectory(name: string) {
  return EXCLUDED_DIRECTORIES.has(name) || name.startsWith('.')
}

interface IndexedTestFile {
  file: string
  relativeFile: string
  source: string
  cases: Array<{ name: string; source: string }>
  revision: string
}

function normalize(value: string) {
  return value.replaceAll('\\', '/')
}

function withoutExtension(value: string) {
  return value.slice(0, value.length - extname(value).length)
}

function globPattern(pattern: string) {
  const escaped = normalize(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replaceAll('**', '\0').replaceAll('*', '[^/]*').replaceAll('\0', '.*')}$`)
}

function matchesPattern(value: string, pattern: string) {
  const normalized = normalize(pattern).replace(/^\.\//, '')
  return normalized.includes('*') ? globPattern(normalized).test(value) : value === normalized
}

function testCases(source: string, fallback: string) {
  const matches: Array<{ name: string; index: number }> = []
  const expression = /\b(?:test|it)\s*\(\s*(['"`])([^'"`\r\n]+)\1/g
  let match: RegExpExecArray | null
  while ((match = expression.exec(source))) matches.push({ name: match[2].trim(), index: match.index })
  if (!matches.length) return [{ name: fallback, source }]
  return matches.map((item, index) => ({
    name: item.name,
    source: source.slice(item.index, matches[index + 1]?.index ?? source.length),
  }))
}

function testKind(file: IndexedTestFile): PageFlowPageTest['kind'] {
  if (/(?:^|\/)(?:e2e|playwright|cypress)(?:\/|$)/i.test(file.relativeFile)) return 'e2e'
  if (/\.(?:tsx|jsx|vue|svelte)$/i.test(file.file)) return 'component'
  return 'unit'
}

function importedFiles(file: IndexedTestFile) {
  const imports: string[] = []
  const expression = /(?:from\s*|import\s*\()(['"])([^'"]+)\1/g
  let match: RegExpExecArray | null
  while ((match = expression.exec(file.source))) {
    if (!match[2].startsWith('.')) continue
    imports.push(withoutExtension(normalize(resolve(dirname(file.file), match[2]))))
  }
  return imports
}

function associationSource(
  route: PageFlowRuntimeRoute,
  file: IndexedTestFile,
  explicit: Record<string, string[]>,
  caseSource: string,
): PageFlowTestSource | undefined {
  const explicitPatterns = Object.entries(explicit)
    .filter(([routePattern]) => matchesPattern(route.path, routePattern))
    .flatMap(([, patterns]) => patterns)
  if (explicitPatterns.some(pattern => matchesPattern(file.relativeFile, pattern))) return 'config'

  if (route.componentFile) {
    const component = withoutExtension(normalize(resolve(route.componentFile)))
    if (importedFiles(file).some(imported => imported === component || `${imported}/index` === component)) return 'import'
    const componentDirectory = normalize(dirname(component))
    const componentName = component.slice(component.lastIndexOf('/') + 1)
    const testStem = file.relativeFile.replace(/(?:[.\-_])(?:test|spec)\.[^.]+$/i, '').split('/').at(-1)
    if (normalize(dirname(file.file)) === componentDirectory && testStem === componentName) return 'convention'
  }

  const escapedPath = route.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (new RegExp(`(['"\`])${escapedPath}\\1`).test(caseSource)) return 'route'
}

function recordsFor(route: PageFlowRuntimeRoute, files: IndexedTestFile[], explicit: Record<string, string[]>) {
  return files.flatMap(file => file.cases.flatMap((testCase, index) => {
    const source = associationSource(route, file, explicit, testCase.source)
    if (!source) return []
    return [{
      id: createHash('sha1').update(`${route.path}:${file.relativeFile}:${index}:${testCase.name}`).digest('hex').slice(0, 12),
      name: testCase.name,
      file: file.relativeFile,
      kind: testKind(file),
      source,
      revision: file.revision,
      status: 'unknown',
    } satisfies PageFlowPageTest]
  }))
}

export function isPageFlowTestFile(file: string) {
  return TEST_FILE.test(file.split(/[\\/]/).at(-1) ?? '')
}

export class PageTestIndex {
  private files = new Map<string, IndexedTestFile>()
  private root: string
  private routes: PageFlowRuntimeRoute[]
  private explicit: Record<string, string[]>

  constructor(
    root: string,
    routes: PageFlowRuntimeRoute[],
    explicit: Record<string, string[]> = {},
  ) {
    this.root = root
    this.routes = routes
    this.explicit = explicit
  }

  setRoutes(routes: PageFlowRuntimeRoute[]) {
    this.routes = routes
  }

  setExplicit(explicit: Record<string, string[]>) {
    this.explicit = explicit
  }

  async scan() {
    const visit = async (directory: string) => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && shouldSkipDirectory(entry.name)) continue
        const file = resolve(directory, entry.name)
        if (entry.isDirectory()) await visit(file)
        else if (entry.isFile() && isPageFlowTestFile(entry.name)) await this.update(file)
      }
    }
    await visit(this.root)
  }

  async update(file: string) {
    const absolute = resolve(file)
    if (!isPageFlowTestFile(absolute)) return
    try {
      const source = await readFile(absolute, 'utf8')
      const relativeFile = normalize(relative(this.root, absolute))
      this.files.set(absolute, {
        file: absolute,
        relativeFile,
        source,
        cases: testCases(source, relativeFile.split('/').at(-1) ?? relativeFile),
        revision: createHash('sha1').update(source).digest('hex').slice(0, 16),
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') this.files.delete(absolute)
      else throw error
    }
  }

  testsFor(path: string) {
    const route = this.routes.find(item => item.path === path)
    if (!route) return []
    return recordsFor(route, [...this.files.values()], this.explicit)
  }
}
