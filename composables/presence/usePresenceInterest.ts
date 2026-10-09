import { onBeforeUnmount, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { usePresence } from '~/composables/usePresence'

/**
 * Keep one user's online status fresh while the owner is mounted: registers presence interest for
 * the current id, follows id changes, and releases it on unmount. Client-only.
 */
export function usePresenceInterest(userId: MaybeRefOrGetter<string | null | undefined>) {
  const { addInterest, removeInterest } = usePresence()
  let current: string | null = null
  watch(
    () => toValue(userId) || null,
    (next) => {
      if (!import.meta.client) return
      if (current && current !== next) removeInterest([current])
      current = next
      if (next) addInterest([next])
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    if (current) removeInterest([current])
    current = null
  })
}
