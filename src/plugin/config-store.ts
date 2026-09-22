import { open, readFile, rename, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { PageFlowOptions } from '../shared/types.ts'
import { stripJsonComments } from './config-json.ts'

const bases = new WeakMap<object, PageFlowOptions>()
const queues = new Map<string, Promise<unknown>>()
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
function parse(source: string): PageFlowOptions {
  const value: unknown = JSON.parse(stripJsonComments(source.replace(/^\uFEFF/, '')))
  if (!record(value)) throw new Error('.pageflow 必须是 JSON 对象')
  for (const key of ['pages', 'pageTree', 'groupNames', 'canvasLayouts']) {
    if (value[key] !== undefined && !record(value[key])) throw new Error(`.pageflow 的 ${key} 必须是对象`)
  }
  return value as PageFlowOptions
}

/** Three-way merge: apply only this writer's changes, rejecting conflicting edits. */
function merge(base: unknown, next: unknown, current: unknown, path = ''): unknown {
  if (equal(base, next)) return current
  if (equal(base, current) || equal(next, current)) return next
  if (record(next) && record(current) && (base === undefined || record(base))) {
    const before = record(base) ? base : {}
    const result = { ...current }
    for (const key of new Set([...Object.keys(before), ...Object.keys(next)])) {
      const value = merge(before[key], next[key], current[key], `${path}/${key}`)
      if (value === undefined) delete result[key]
      else result[key] = value
    }
    return result
  }
  throw new Error(`配置已被其他操作修改（${path}），请刷新后重试`)
}

export async function readPageFlowConfig(file: string): Promise<PageFlowOptions> {
  const value = parse(await readFile(file, 'utf8'))
  bases.set(value, structuredClone(value))
  return value
}

export async function readPageFlowConfigWithBackup(file: string) {
  try { return await readPageFlowConfig(file) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw error
    try {
      const backup = parse(await readFile(`${file}.bak`, 'utf8'))
      console.warn(`PageFlow 配置读取失败，临时使用 ${file}.bak；原文件已保留，请修复后再保存。`)
      return backup
    } catch { throw error }
  }
}

async function atomicWrite(file: string, source: string) {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  try {
    const handle = await open(temporary, 'wx')
    try { await handle.writeFile(source, 'utf8'); await handle.sync() } finally { await handle.close() }
    // Never unlink the destination: failed replacement must leave it intact.
    await rename(temporary, file)
  } finally { await unlink(temporary).catch(() => undefined) }
}

async function exclusive<T>(file: string, action: () => Promise<T>) {
  const key = resolve(file)
  const previous = queues.get(key) ?? Promise.resolve()
  const operation = previous.catch(() => undefined).then(async () => {
    const lockPath = `${key}.lock`
    let lock
    for (let attempt = 0; !lock; attempt++) {
      try { lock = await open(lockPath, 'wx') }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
        if (attempt >= 50) throw new Error(`配置文件被占用：${lockPath}；确认其他进程已退出后可移除锁文件`)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    try { return await action() }
    finally { await lock.close(); await unlink(lockPath) }
  })
  queues.set(key, operation)
  try { return await operation }
  finally { if (queues.get(key) === operation) queues.delete(key) }
}

export async function writePageFlowConfig(file: string, value: PageFlowOptions) {
  const base = bases.get(value)
  if (!base) throw new Error('配置更新缺少原始快照')
  return exclusive(file, async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const original = await readFile(file, 'utf8')
      const current = parse(original) // Never overwrite a broken file with defaults or a backup.
      const next = merge(base, value, current) as PageFlowOptions
      const source = `${JSON.stringify(next, null, 2)}\n`
      parse(source)
      if (equal(current, next)) return
      await atomicWrite(`${file}.bak`, original)
      if (await readFile(file, 'utf8') !== original) continue
      await atomicWrite(file, source)
      Object.keys(value).forEach(key => delete (value as Record<string, unknown>)[key])
      Object.assign(value, next)
      bases.set(value, structuredClone(next))
      return
    }
    throw new Error('配置文件持续被外部修改，请稍后重试')
  })
}

export async function ensurePageFlowConfig(file: string, defaults: PageFlowOptions) {
  await exclusive(file, async () => {
    try { await readFile(file); return }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    const source = `${JSON.stringify(defaults, null, 2)}\n`
    parse(source)
    await atomicWrite(file, source)
  })
}
