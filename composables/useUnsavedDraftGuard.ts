import type { CreateMediaPayload } from '~/composables/useComposerMedia'

export type UnsavedDraftSnapshot = {
  body: string
  media: CreateMediaPayload[]
  /** When set, update this draft instead of creating a new one. */
  draftId?: string | null
}

type GuardEntry = {
  id: string
  hasUnsaved: () => boolean
  snapshot: () => UnsavedDraftSnapshot
  clear: () => void
}

// Client-only in-memory registry. (Do not use useState: it would try to serialize functions on SSR.)
const registry: GuardEntry[] = []

export function useUnsavedDraftGuard() {
  function register(entry: GuardEntry): () => void {
    const id = String(entry?.id ?? '').trim()
    if (!id) return () => {}
    const idx = registry.findIndex((e) => e.id === id)
    if (idx >= 0) registry.splice(idx, 1)
    registry.push(entry)
    return () => {
      const i = registry.findIndex((e) => e.id === id)
      if (i >= 0) registry.splice(i, 1)
    }
  }

  /** Most recent entry wins (usually the one currently on screen). */
  function activeUnsavedEntry(): GuardEntry | null {
    for (let i = registry.length - 1; i >= 0; i--) {
      const e = registry[i]
      if (e?.hasUnsaved?.()) return e
    }
    return null
  }

  return { register, activeUnsavedEntry }
}

