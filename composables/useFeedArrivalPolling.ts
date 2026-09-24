import { onScopeDispose, watch, type Ref } from 'vue'
import type { FeedPost } from '~/types/api'

/** One bounded check per minute; paused/offscreen requests cannot affect a later feed. */
export function useFeedArrivalPolling(options: {
  active: Ref<boolean>
  periodic: Ref<boolean>
  context: Ref<string>
  fetch: (signal: AbortSignal) => Promise<FeedPost[]>
  receive: (posts: FeedPost[]) => void
}) {
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let request: AbortController | undefined
  let disposed = false

  async function check() {
    if (disposed || !options.active.value || request) return
    const current = generation
    const controller = new AbortController()
    request = controller
    try {
      const posts = await options.fetch(controller.signal)
      if (!disposed && !controller.signal.aborted && current === generation && options.active.value) options.receive(posts)
    } catch {
      // A quiet background check must not disrupt reading. Retry on the next interval.
    } finally {
      if (request === controller) request = undefined
    }
  }
  function stop() {
    generation++
    clearTimeout(timer)
    request?.abort()
    request = undefined
  }
  function schedule() {
    if (disposed || !options.active.value || !options.periodic.value) return
    const cycle = generation
    timer = setTimeout(async () => {
      await check()
      if (cycle === generation) schedule()
    }, 60_000)
  }
  watch([options.active, options.periodic, options.context], () => { stop(); schedule() }, { immediate: true, flush: 'sync' })
  onScopeDispose(() => { disposed = true; stop() })
  return { check }
}
