import type { MentionUser } from './mentionScore'

const CACHE_TTL_MS = 30_000
const MAX_CACHE_ENTRIES = 200

/** Short-lived cache of mention search results keyed by normalized query. */
export function createMentionCache() {
  const entries = new Map<string, { expiresAt: number; items: MentionUser[] }>()

  function set(query: string, items: MentionUser[]) {
    entries.set(query, { expiresAt: Date.now() + CACHE_TTL_MS, items })
    while (entries.size > MAX_CACHE_ENTRIES) {
      const firstKey = entries.keys().next().value as string | undefined
      if (!firstKey) break
      entries.delete(firstKey)
    }
  }

  /** Results of the longest cached prefix of `query`, so typing on shows something immediately. */
  function getBestPrefix(query: string): MentionUser[] | null {
    const now = Date.now()
    for (let i = query.length; i >= 1; i--) {
      const key = query.slice(0, i)
      const hit = entries.get(key)
      if (!hit) continue
      if (hit.expiresAt <= now) {
        entries.delete(key)
        continue
      }
      return hit.items
    }
    return null
  }

  return { set, getBestPrefix }
}
