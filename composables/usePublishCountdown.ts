/**
 * Reactive countdown to a UTC ISO timestamp (e.g. nextWordPublishAt).
 * Returns a human-readable string like "5h 22m" (hours mode) or "8m 23s" / "42s" (minutes/seconds mode).
 * Returns null when the timestamp is in the past or not set.
 */
export function usePublishCountdown(targetIso: Ref<string | null | undefined>) {
  const remaining = ref<string | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  function compute() {
    const iso = targetIso.value
    if (!iso) { remaining.value = null; return }
    const ms = new Date(iso).getTime() - Date.now()
    if (ms <= 0) { remaining.value = null; return }

    const totalSec = Math.ceil(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60

    if (h > 0) {
      remaining.value = `${h}h ${m}m`
    } else if (m > 0) {
      remaining.value = `${m}m ${s}s`
    } else {
      remaining.value = `${s}s`
    }
  }

  function start() {
    stop()
    compute()
    timer = setInterval(compute, 1000)
  }

  function stop() {
    if (timer !== null) { clearInterval(timer); timer = null }
  }

  watch(targetIso, () => { stop(); start() }, { immediate: false })

  if (import.meta.client) {
    onMounted(start)
    onBeforeUnmount(stop)
    onActivated(start)
    onDeactivated(stop)
  }

  return { remaining }
}
