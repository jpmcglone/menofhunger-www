type QueueItem = {
  task: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

const MAX_CONCURRENT = 3
let activeCount = 0
const queue: QueueItem[] = []

function pumpQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift()
    if (!next) return
    activeCount += 1
    next.task()
      .then(next.resolve, next.reject)
      .finally(() => {
        activeCount = Math.max(0, activeCount - 1)
        pumpQueue()
      })
  }
}

function runLimited<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      task: () => task() as Promise<unknown>,
      resolve: (value) => resolve(value as T),
      reject,
    })
    pumpQueue()
  })
}

export function usePreviewFetchLimiter() {
  return { runLimited }
}

