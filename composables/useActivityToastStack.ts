import { ref } from 'vue'
import type { UserTierLike } from '~/utils/user-tier'

export type ActivityToast = {
  id: string
  kind: string
  title: string
  context: string
  to: string
  actors?: UserTierLike[]
  notificationIDs?: string[]
  subjectPostIDs?: string[]
  boardThreadIDs?: string[]
  /** Only individual cards acknowledge a read; a burst summary opens the inbox. */
  readNotificationID?: string
}
type Clock = { timer: ReturnType<typeof setTimeout> | null; remaining: number; started: number; hovered: boolean; focused: boolean }

/** Temporary activity only; the inbox remains the durable source of truth. */
export function useActivityToastStack() {
  const toasts = ref<ActivityToast[]>([])
  const clocks = new Map<string, Clock>()
  const seen = new Set<string>()

  function dismiss(id: string) {
    const clock = clocks.get(id)
    if (clock?.timer) clearTimeout(clock.timer)
    clocks.delete(id)
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }
  function schedule(id: string, clock: Clock) {
    if (clock.hovered || clock.focused || clock.timer) return
    clock.started = Date.now()
    clock.timer = setTimeout(() => dismiss(id), clock.remaining)
  }
  function push(toast: ActivityToast) {
    if (seen.has(toast.id)) return false
    seen.add(toast.id)
    if (seen.size > 1000) seen.delete(seen.values().next().value!)
    if (toasts.value.length >= 3) {
      const oldest = toasts.value[0]!
      const clock = clocks.get(oldest.id)
      // Keep an actively read or keyboard-focused card in place.
      if (clock?.focused || clock?.hovered) return false
      dismiss(oldest.id)
    }
    const clock: Clock = { timer: null, remaining: 6000, started: 0, hovered: false, focused: false }
    clocks.set(toast.id, clock)
    toasts.value = [...toasts.value, toast]
    schedule(toast.id, clock)
    return true
  }
  function pause(id: string, kind: 'hovered' | 'focused', paused: boolean) {
    const clock = clocks.get(id)
    if (!clock) return
    clock[kind] = paused
    if (paused && clock.timer) {
      clock.remaining = Math.max(0, clock.remaining - (Date.now() - clock.started))
      clearTimeout(clock.timer)
      clock.timer = null
    }
    schedule(id, clock)
  }
  function clear(resetIdentity = false) {
    for (const id of clocks.keys()) dismiss(id)
    if (resetIdentity) seen.clear()
  }
  return { toasts, push, dismiss, pause, clear }
}
