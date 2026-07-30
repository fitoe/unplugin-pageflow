interface ThumbnailResourceHooks {
  fetchBlob: (url: string) => Promise<Blob>
  createObjectUrl: (blob: Blob) => string
  revokeObjectUrl: (url: string) => void
}

const browserHooks: ThumbnailResourceHooks = {
  fetchBlob: async url => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to load thumbnail resource: ${response.status}`)
    return response.blob()
  },
  createObjectUrl: blob => URL.createObjectURL(blob),
  revokeObjectUrl: url => URL.revokeObjectURL(url),
}

export class ThumbnailResourceCache {
  private readonly entries = new Map<string, { source: string, touched: number }>()
  private readonly pending = new Map<string, Promise<string>>()
  private clock = 0
  private disposed = false

  constructor(
    private readonly maximum = 160,
    private readonly hooks: ThumbnailResourceHooks = browserHooks,
  ) {}

  get size() {
    return this.entries.size
  }

  get(url: string) {
    const entry = this.entries.get(url)
    if (!entry) return
    entry.touched = ++this.clock
    return entry.source
  }

  async load(url: string) {
    if (this.disposed) throw new Error('Thumbnail resource cache is disposed')
    const cached = this.get(url)
    if (cached) return cached
    const existing = this.pending.get(url)
    if (existing) return existing
    const request = this.hooks.fetchBlob(url).then(blob => {
      const source = this.hooks.createObjectUrl(blob)
      if (this.disposed) {
        this.hooks.revokeObjectUrl(source)
        throw new Error('Thumbnail resource cache is disposed')
      }
      this.entries.set(url, { source, touched: ++this.clock })
      this.pending.delete(url)
      return source
    }, error => {
      this.pending.delete(url)
      throw error
    })
    this.pending.set(url, request)
    return request
  }

  trim(protectedUrls = new Set<string>()) {
    const removable = [...this.entries.entries()]
      .filter(([url]) => !protectedUrls.has(url))
      .sort((a, b) => a[1].touched - b[1].touched)
    while (this.entries.size > this.maximum && removable.length) {
      const [url, entry] = removable.shift()!
      this.entries.delete(url)
      this.hooks.revokeObjectUrl(entry.source)
    }
  }

  dispose() {
    this.disposed = true
    this.entries.forEach(entry => this.hooks.revokeObjectUrl(entry.source))
    this.entries.clear()
    this.pending.clear()
  }
}
