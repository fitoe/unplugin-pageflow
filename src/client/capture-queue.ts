interface CaptureQueueHost {
  setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>
  clearTimeout(timer: ReturnType<typeof setTimeout>): void
  requestIdleCallback?: (callback: () => void) => number
  cancelIdleCallback?: (id: number) => void
}

export class CaptureQueue {
  private timer: ReturnType<typeof setTimeout> | undefined
  private idleCallback: number | undefined
  private readonly waiters = new Map<string, Set<() => void>>()

  constructor(private readonly host: CaptureQueueHost) {}

  get scheduled() {
    return this.timer != null || this.idleCallback != null
  }

  schedule(delay: number, waitForIdle: boolean, task: () => void) {
    if (this.scheduled) return false
    this.timer = this.host.setTimeout(() => {
      this.timer = undefined
      const start = () => {
        this.idleCallback = undefined
        task()
      }
      if (waitForIdle && this.host.requestIdleCallback)
        this.idleCallback = this.host.requestIdleCallback(start)
      else start()
    }, delay)
    return true
  }

  cancel() {
    if (this.timer != null) this.host.clearTimeout(this.timer)
    if (this.idleCallback != null) this.host.cancelIdleCallback?.(this.idleCallback)
    this.timer = undefined
    this.idleCallback = undefined
  }

  waitFor(pageId: string, timeoutMs = 35000) {
    return new Promise<void>(resolve => {
      let timer: ReturnType<typeof setTimeout>
      const done = () => {
        this.host.clearTimeout(timer)
        this.waiters.get(pageId)?.delete(done)
        resolve()
      }
      const waiters = this.waiters.get(pageId) ?? new Set<() => void>()
      waiters.add(done)
      this.waiters.set(pageId, waiters)
      timer = this.host.setTimeout(done, timeoutMs)
    })
  }

  complete(pageId: string) {
    this.waiters.get(pageId)?.forEach(resolve => resolve())
    this.waiters.delete(pageId)
  }

  dispose() {
    this.cancel()
    this.waiters.forEach(waiters => waiters.forEach(resolve => resolve()))
    this.waiters.clear()
  }
}
