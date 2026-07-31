import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PageFlowPageTest } from '../shared/types.ts'

const RESULTS_FILE = 'test-results.json'
const MAXIMUM_RESULTS = 500
const MAXIMUM_OUTPUT_LENGTH = 20_000

type TestResult = Pick<PageFlowPageTest, 'status' | 'duration' | 'output'>

interface StoredTestResult extends TestResult {
  revision: string
  updatedAt: number
}

export function createPageTestResultCache(cacheDirectory: string) {
  let resultsPromise: Promise<Record<string, StoredTestResult>> | undefined
  let writeQueue = Promise.resolve()

  const load = async () => {
    await mkdir(cacheDirectory, { recursive: true })
    try {
      const value = JSON.parse(await readFile(join(cacheDirectory, RESULTS_FILE), 'utf8'))
      return value && typeof value === 'object' ? value as Record<string, StoredTestResult> : {}
    } catch {
      return {}
    }
  }

  const results = () => resultsPromise ??= load()
  const save = (value: Record<string, StoredTestResult>) => {
    writeQueue = writeQueue.then(() => writeFile(join(cacheDirectory, RESULTS_FILE), JSON.stringify(value), 'utf8'))
    return writeQueue
  }

  return {
    async read(test: PageFlowPageTest): Promise<TestResult | undefined> {
      const stored = (await results())[test.id]
      if (!stored || !test.revision || stored.revision !== test.revision) return
      return { status: stored.status, duration: stored.duration, output: stored.output }
    },

    async write(test: PageFlowPageTest, result: TestResult) {
      if (!test.revision) return
      const value = await results()
      value[test.id] = {
        ...result,
        output: result.output?.slice(-MAXIMUM_OUTPUT_LENGTH),
        revision: test.revision,
        updatedAt: Date.now(),
      }
      const entries = Object.entries(value)
      if (entries.length > MAXIMUM_RESULTS) {
        entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt)
        entries.slice(MAXIMUM_RESULTS).forEach(([id]) => delete value[id])
      }
      await save(value)
    },
  }
}
