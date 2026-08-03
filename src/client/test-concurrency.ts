export async function runWithConcurrency<T>(items: T[], limit: number, run: (item: T) => Promise<void>, stopped: () => boolean) {
  let index = 0
  const worker = async () => {
    while (!stopped()) {
      const item = items[index++]
      if (item === undefined) return
      await run(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker))
}
