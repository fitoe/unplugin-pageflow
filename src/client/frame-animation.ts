interface FrameAnimationHost {
  now(): number
  requestAnimationFrame(callback: (time: number) => void): number
  cancelAnimationFrame(id: number): void
}

export class FrameAnimation {
  private frame: number | undefined
  private generation = 0

  constructor(private readonly host: FrameAnimationHost) {}

  get running() {
    return this.frame != null
  }

  start(duration: number, update: (progress: number) => void, done?: () => void) {
    this.cancel()
    const generation = ++this.generation
    const startedAt = this.host.now()
    const tick = (time: number) => {
      if (generation !== this.generation) return
      const progress = Math.min(1, Math.max(0, (time - startedAt) / duration))
      update(progress)
      if (generation !== this.generation) return
      if (progress < 1) this.frame = this.host.requestAnimationFrame(tick)
      else {
        this.frame = undefined
        done?.()
      }
    }
    this.frame = this.host.requestAnimationFrame(tick)
  }

  cancel() {
    this.generation++
    if (this.frame != null) this.host.cancelAnimationFrame(this.frame)
    this.frame = undefined
  }

  dispose() {
    this.cancel()
  }
}
