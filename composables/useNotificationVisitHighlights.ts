import { ref, watch, type Ref } from 'vue'
import type { NotificationFeedItem } from '~/types/api'

/** Presentation only: automatic read acknowledgements must not erase the entry cue. */
export function useNotificationVisitHighlights(items: Ref<NotificationFeedItem[]>) {
  const keys = ref(new Set<string>())
  let active = false

  function capture() {
    if (!active) return
    const next = new Set(keys.value)
    for (const item of items.value) {
      const row = item.type === 'single' ? item.notification : item.type === 'group' ? item.group : item.rollup
      const prefix = item.type === 'followed_posts_rollup' ? 'rollup' : item.type
      if (!row.readAt) next.add(`${prefix}:${row.id}`)
    }
    keys.value = next
  }

  // Capture before a rendered post can report its view, including pagination and live arrivals.
  watch(items, capture, { deep: true, flush: 'sync' })

  function clear() { keys.value = new Set() }
  function begin() {
    if (active) return
    active = true
    clear()
    capture()
  }
  function end() {
    active = false
    clear()
  }
  return { keys, begin, end, clear }
}
