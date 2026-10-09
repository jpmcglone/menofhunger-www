import type { ComputedRef } from 'vue'
import type { UnsavedDraftSnapshot } from '~/composables/useUnsavedDraftGuard'

/** Registers the composer with the global unsaved-draft guard and unregisters on unmount. */
export function useComposerUnsavedGuard(opts: {
  enabled: ComputedRef<boolean>
  hasUnsaved: () => boolean
  snapshot: () => UnsavedDraftSnapshot
  clear: () => void
}) {
  let unregisterUnsavedGuard: (() => void) | null = null
  const unsavedGuardId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `composer:${crypto.randomUUID()}`
      : `composer:${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  function registerUnsavedGuardIfNeeded() {
    if (!import.meta.client) return
    if (!opts.enabled.value) return
    if (unregisterUnsavedGuard) return
    const { register } = useUnsavedDraftGuard()
    unregisterUnsavedGuard = register({
      id: unsavedGuardId,
      hasUnsaved: opts.hasUnsaved,
      snapshot: opts.snapshot,
      clear: opts.clear,
    })
  }

  onBeforeUnmount(() => {
    unregisterUnsavedGuard?.()
    unregisterUnsavedGuard = null
  })

  return { registerUnsavedGuardIfNeeded }
}
