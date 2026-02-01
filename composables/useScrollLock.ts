import type { Ref } from 'vue'

/**
 * Locks document scroll when the given condition is true.
 * Restores previous overflow on cleanup or when condition becomes false.
 * Use for modals/overlays so background content doesn't scroll.
 */
export function useScrollLock(isLocked: Ref<boolean>) {
  if (!import.meta.client) return

  watch(
    isLocked,
    (locked) => {
      if (locked) {
        document.documentElement.style.overflow = 'hidden'
      } else {
        document.documentElement.style.overflow = ''
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    if (isLocked.value) {
      document.documentElement.style.overflow = ''
    }
  })
}
