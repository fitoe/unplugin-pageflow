import { createHash } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { PageFlowThumbnailManifest, PageFlowThumbnailRecord } from '../shared/types.ts'

const MANIFEST_FILE = 'manifest.json'
const DEFAULT_MAXIMUM_BYTES = 256 * 1024 * 1024

function imageExtension(mimeType: string) {
  if (mimeType === 'image/webp') return '.webp'
  if (mimeType === 'image/png') return '.png'
  return '.jpg'
}

function pageGroup(slot: string) {
  const match = slot.match(/^([^:]+):(compact|full):(.*?)(?::tile:\d+)?$/)
  return match ? `${match[1]}:${match[3]}` : slot
}

export function createThumbnailCache(cacheDirectory: string, maximumBytes = DEFAULT_MAXIMUM_BYTES) {
  let manifestPromise: Promise<PageFlowThumbnailManifest> | undefined
  let writeQueue = Promise.resolve()

  const loadManifest = async () => {
    await mkdir(cacheDirectory, { recursive: true })
    try {
      const value = JSON.parse(await readFile(join(cacheDirectory, MANIFEST_FILE), 'utf8'))
      return value && typeof value === 'object' ? value as PageFlowThumbnailManifest : {}
    } catch {
      return {}
    }
  }

  const getManifest = () => manifestPromise ??= loadManifest()

  const saveManifest = (manifest: PageFlowThumbnailManifest) => {
    writeQueue = writeQueue.then(() => writeFile(
      join(cacheDirectory, MANIFEST_FILE),
      JSON.stringify(manifest),
      'utf8',
    ))
    return writeQueue
  }

  return {
    async manifest() {
      return { ...await getManifest() }
    },

    async read(slot: string) {
      const record = (await getManifest())[slot]
      if (!record) return
      try {
        const data = await readFile(join(cacheDirectory, record.file))
        record.updatedAt = Date.now()
        return { record, data }
      } catch {
        return
      }
    },

    async write(
      slot: string,
      revision: string,
      width: number,
      height: number,
      mimeType: string,
      data: Uint8Array,
      metadata: Partial<Pick<PageFlowThumbnailRecord, 'pageHeight' | 'tileCount' | 'tileIndex' | 'tileTop'>> = {},
    ) {
      const manifest = await getManifest()
      const previous = manifest[slot]
      const file = `${createHash('sha256').update(`${slot}\0${revision}`).digest('hex')}${imageExtension(mimeType)}`
      await writeFile(join(cacheDirectory, file), data)
      const record: PageFlowThumbnailRecord = {
        slot,
        revision,
        width,
        height,
        mimeType,
        file,
        updatedAt: Date.now(),
        bytes: data.byteLength,
        ...metadata,
      }
      manifest[slot] = record

      const staleFiles = new Set<string>()
      if (metadata.tileIndex === 0 && metadata.tileCount != null) {
        const root = slot.replace(/:tile:\d+$/, '')
        for (const [key, value] of Object.entries(manifest)) {
          const tileMatch = key.match(new RegExp(`^${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:tile:(\\d+)$`))
          if (key === root || (tileMatch && Number(tileMatch[1]) >= metadata.tileCount)) {
            delete manifest[key]
            staleFiles.add(value.file)
          }
        }
      }

      let totalBytes = Object.values(manifest).reduce((total, item) => total + (item.bytes ?? 0), 0)
      if (totalBytes > maximumBytes) {
        const protectedGroup = pageGroup(slot)
        const groups = new Map<string, PageFlowThumbnailRecord[]>()
        Object.values(manifest).forEach(item => {
          const group = pageGroup(item.slot)
          groups.set(group, [...groups.get(group) ?? [], item])
        })
        const candidates = [...groups.entries()]
          .filter(([group]) => group !== protectedGroup)
          .sort((a, b) => Math.max(...a[1].map(item => item.updatedAt)) - Math.max(...b[1].map(item => item.updatedAt)))
        for (const [, items] of candidates) {
          if (totalBytes <= maximumBytes) break
          items.forEach(item => {
            delete manifest[item.slot]
            staleFiles.add(item.file)
            totalBytes -= item.bytes ?? 0
          })
        }
      }
      await saveManifest(manifest)
      if (previous?.file && previous.file !== file && extname(previous.file))
        await unlink(join(cacheDirectory, previous.file)).catch(() => undefined)
      await Promise.all([...staleFiles].filter(stale => stale !== file).map(stale =>
        unlink(join(cacheDirectory, stale)).catch(() => undefined),
      ))
      return record
    },
  }
}
