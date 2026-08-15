interface PreviewFrameTimerHost {
  setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>
  clearTimeout(timer: ReturnType<typeof setTimeout>): void
}

export class PreviewFrameRegistry {
  private readonly frames = new Map<string, HTMLIFrameElement>()
  private pageIdsByWindow = new WeakMap<object, string>()
  private readonly physicalPageIdsByLogical = new Map<string, string>()
  private readonly logicalPageIdsByPhysical = new Map<string, string>()
  private readonly cleanups = new Map<string, () => void>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(private readonly timerHost: PreviewFrameTimerHost = globalThis) {}

  get(pageId: string) {
    return this.frames.get(this.physicalPageIdsByLogical.get(pageId) ?? pageId)
  }

  forEach(callback: (frame: HTMLIFrameElement, pageId: string) => void) {
    this.frames.forEach(callback)
  }

  set(pageId: string, frame: HTMLIFrameElement) {
    if (this.frames.get(pageId) === frame) return false
    this.clearReassignment(pageId)
    this.releasePageResources(pageId)
    const previousWindow = this.frames.get(pageId)?.contentWindow
    if (previousWindow) this.pageIdsByWindow.delete(previousWindow)
    this.frames.set(pageId, frame)
    if (frame.contentWindow) this.pageIdsByWindow.set(frame.contentWindow, pageId)
    return true
  }

  remove(pageId: string) {
    const frame = this.frames.get(pageId)
    if (frame?.contentWindow) this.pageIdsByWindow.delete(frame.contentWindow)
    this.frames.delete(pageId)
    this.clearReassignment(pageId)
    this.releasePageResources(pageId)
  }

  reassign(physicalPageId: string, logicalPageId: string) {
    const frame = this.frames.get(physicalPageId)
    if (!frame) return false
    this.clearReassignment(physicalPageId)
    const previousPhysicalPageId = this.physicalPageIdsByLogical.get(logicalPageId)
    if (previousPhysicalPageId && previousPhysicalPageId !== physicalPageId)
      this.clearReassignment(previousPhysicalPageId)
    if (physicalPageId !== logicalPageId) {
      this.logicalPageIdsByPhysical.set(physicalPageId, logicalPageId)
      this.physicalPageIdsByLogical.set(logicalPageId, physicalPageId)
    }
    if (frame.contentWindow) this.pageIdsByWindow.set(frame.contentWindow, logicalPageId)
    return true
  }

  restore(physicalPageId: string) {
    const frame = this.frames.get(physicalPageId)
    if (!frame) return false
    this.clearReassignment(physicalPageId)
    if (frame.contentWindow) this.pageIdsByWindow.set(frame.contentWindow, physicalPageId)
    return true
  }

  pageIdForSource(source: MessageEventSource | null) {
    if (!source) return
    const indexed = this.pageIdsByWindow.get(source)
    if (indexed) return indexed
    const matched = [...this.frames.entries()].find(([, frame]) => frame.contentWindow === source)?.[0]
    if (matched) this.pageIdsByWindow.set(source, matched)
    return matched
  }

  setCleanup(pageId: string, cleanup: () => void) {
    this.cleanups.get(pageId)?.()
    this.cleanups.set(pageId, cleanup)
  }

  debounce(pageId: string, delay: number, callback: () => void) {
    const current = this.timers.get(pageId)
    if (current) this.timerHost.clearTimeout(current)
    const timer = this.timerHost.setTimeout(() => {
      this.timers.delete(pageId)
      callback()
    }, delay)
    this.timers.set(pageId, timer)
  }

  dispose() {
    const pageIds = new Set([...this.frames.keys(), ...this.cleanups.keys(), ...this.timers.keys()])
    pageIds.forEach(pageId => this.releasePageResources(pageId))
    this.frames.clear()
    this.physicalPageIdsByLogical.clear()
    this.logicalPageIdsByPhysical.clear()
    this.pageIdsByWindow = new WeakMap()
  }

  private clearReassignment(physicalPageId: string) {
    const logicalPageId = this.logicalPageIdsByPhysical.get(physicalPageId)
    if (!logicalPageId) return
    this.logicalPageIdsByPhysical.delete(physicalPageId)
    if (this.physicalPageIdsByLogical.get(logicalPageId) === physicalPageId)
      this.physicalPageIdsByLogical.delete(logicalPageId)
  }

  private releasePageResources(pageId: string) {
    this.cleanups.get(pageId)?.()
    this.cleanups.delete(pageId)
    const timer = this.timers.get(pageId)
    if (timer) this.timerHost.clearTimeout(timer)
    this.timers.delete(pageId)
  }
}
