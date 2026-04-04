/**
 * Client-side cache of usernames confirmed to exist on the platform, plus their tier.
 *
 * Shared via useState — one cache for the whole session. No size cap; usernames are tiny.
 *
 * Ways a username enters the cache:
 *   1. Background validation via /users/:username/preview triggered by @mention in chat.
 *   2. markValid() called by the hover-preview popover (full tier data available).
 *   3. markValid() called by any profile-page or search-result load.
 */

import { userColorTier, type UserColorTier, type UserTierLike } from '~/utils/user-tier'

const MENTION_RE = /@([a-zA-Z0-9_]+)/g

type TierLike = UserTierLike

// ─── Module-level batch state ─────────────────────────────────────────────────
// Many username lookups can resolve in rapid succession (e.g. opening a chat
// with 50 messages that all contain @mentions). Without batching, each resolved
// lookup immediately mutates validSet/tierMap, which invalidates displayBodySegments
// in every mounted ChatMessageRichBody — causing O(messages × mentions) re-renders
// that freeze the browser.
//
// Instead we accumulate updates here and flush them all in a single nextTick,
// collapsing the cascade to ONE re-render wave regardless of how many lookups land.
const _pendingValid = new Set<string>()
const _pendingTier = new Map<string, UserColorTier>()
let _flushScheduled = false

// ─────────────────────────────────────────────────────────────────────────────

export function useValidatedChatUsernames() {
  const { apiFetchData } = useApiClient()

  // Usernames confirmed to exist.
  const validSet = useState<Set<string>>('chat-validated-usernames', () => new Set())
  // Negative cache: confirmed not found. Prevents re-fetching 404s.
  const invalidSet = useState<Set<string>>('chat-invalid-usernames', () => new Set())
  // In-flight lookups — deduplicate concurrent requests (plain Set, not reactive).
  const pending = new Set<string>()
  // Tier per username — populated alongside validation. Enables colored @mention rendering.
  const tierMap = useState<Map<string, UserColorTier>>('chat-username-tiers', () => new Map())

  // Flush all batched valid/tier updates as a single reactive write, so many
  // concurrent lookups resolving at once only cause one re-render wave.
  function flushBatch() {
    if (_flushScheduled) return
    _flushScheduled = true
    void nextTick(() => {
      _flushScheduled = false
      if (_pendingValid.size > 0) {
        validSet.value = new Set([...validSet.value, ..._pendingValid])
        _pendingValid.clear()
      }
      if (_pendingTier.size > 0) {
        const next = new Map(tierMap.value)
        for (const [un, tier] of _pendingTier) next.set(un, tier)
        tierMap.value = next
        _pendingTier.clear()
      }
    })
  }

  /**
   * Mark a username as valid. Optionally provide tier fields to also cache their color.
   * Call this whenever you learn a user exists — from hover preview, profile load, search results, etc.
   */
  function markValid(username: string, tierData?: TierLike | null) {
    const un = (username ?? '').toLowerCase().trim()
    if (!un) return
    if (!validSet.value.has(un)) {
      validSet.value = new Set([...validSet.value, un])
    }
    if (tierData) {
      const tier = userColorTier(tierData)
      if (tier !== 'normal' || tierMap.value.has(un)) {
        const next = new Map(tierMap.value)
        next.set(un, tier)
        tierMap.value = next
      }
    }
  }

  /** Returns the cached tier for a username, or 'normal' if unknown. */
  function tierForUsername(username: string): UserColorTier {
    return tierMap.value.get((username ?? '').toLowerCase().trim()) ?? 'normal'
  }

  async function lookupOne(username: string) {
    const un = username.toLowerCase().trim()
    if (!un) return
    if (validSet.value.has(un) || _pendingValid.has(un) || invalidSet.value.has(un) || pending.has(un)) return

    pending.add(un)
    try {
      const data = await apiFetchData<TierLike & { id?: string }>(
        `/users/${encodeURIComponent(un)}/preview`,
        { method: 'GET' },
      )
      if (data?.id) {
        _pendingValid.add(un)
        const tier = userColorTier(data)
        if (tier !== 'normal' || tierMap.value.has(un)) _pendingTier.set(un, tier)
        flushBatch()
      } else {
        invalidSet.value = new Set([...invalidSet.value, un])
      }
    } catch {
      invalidSet.value = new Set([...invalidSet.value, un])
    } finally {
      pending.delete(un)
    }
  }

  /**
   * Scan a chat message body for @mentions and kick off background validation
   * for any username not already in knownUsernames.
   */
  function validateMentionsInBody(body: string, knownUsernames: ReadonlySet<string>) {
    if (!import.meta.client || !body) return
    for (const m of body.matchAll(MENTION_RE)) {
      const un = m[1]!.toLowerCase()
      if (!knownUsernames.has(un)) void lookupOne(un)
    }
  }

  return { validSet: readonly(validSet), tierMap: readonly(tierMap), tierForUsername, markValid, validateMentionsInBody }
}
