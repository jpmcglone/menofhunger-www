/**
 * Client-side cache of usernames confirmed to exist on the platform, plus their tier.
 *
 * Shared via useState — one cache for the whole session. No size cap; usernames are tiny.
 *
 * Ways a username enters the cache:
 *   1. Background validation triggered by @mention in chat. Lookups are
 *      coalesced into a single POST /users/preview/batch per animation frame
 *      so a chat with 50 messages full of @mentions costs ONE request, not 50.
 *   2. markValid() called by the hover-preview popover (full tier data available).
 *   3. markValid() called by any profile-page or search-result load.
 */

import { userColorTier, type UserColorTier, type UserTierLike } from '~/utils/user-tier'
import type { UserPreviewBatchEntry } from '~/types/api'

const MENTION_RE = /@([a-zA-Z0-9_]+)/g
const BATCH_MAX = 50

type TierLike = UserTierLike

// ─── Module-level batch state ─────────────────────────────────────────────────
// Many username lookups can resolve in rapid succession (e.g. opening a chat
// with 50 messages that all contain @mentions). Without batching, each resolved
// lookup immediately mutates validSet/tierMap, which invalidates displayBodySegments
// in every mounted ChatMessageRichBody — causing O(messages × mentions) re-renders
// that freeze the browser.
//
// We accumulate updates in two places:
//   1. _pendingLookups — usernames we still need to ask the server about. Flushed
//      as ONE batch request per animation frame.
//   2. _pendingValid / _pendingTier — resolved data waiting to land in the
//      reactive caches. Flushed as ONE reactive write per nextTick.
const _pendingValid = new Set<string>()
const _pendingTier = new Map<string, UserColorTier>()
let _flushReactiveScheduled = false

const _pendingLookups = new Set<string>()
let _lookupFlushScheduled = false

// ─────────────────────────────────────────────────────────────────────────────

export function useValidatedChatUsernames() {
  const { apiFetchData } = useApiClient()

  // Usernames confirmed to exist.
  const validSet = useState<Set<string>>('chat-validated-usernames', () => new Set())
  // Negative cache: confirmed not found. Prevents re-fetching 404s.
  const invalidSet = useState<Set<string>>('chat-invalid-usernames', () => new Set())
  // In-flight lookups — deduplicate concurrent requests (plain Set, not reactive).
  const inFlight = new Set<string>()
  // Tier per username — populated alongside validation. Enables colored @mention rendering.
  const tierMap = useState<Map<string, UserColorTier>>('chat-username-tiers', () => new Map())

  function flushReactive() {
    if (_flushReactiveScheduled) return
    _flushReactiveScheduled = true
    void nextTick(() => {
      _flushReactiveScheduled = false
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

  function flushLookups() {
    if (_lookupFlushScheduled) return
    _lookupFlushScheduled = true

    const dispatch = async () => {
      _lookupFlushScheduled = false
      if (_pendingLookups.size === 0) return

      const all = [..._pendingLookups]
      _pendingLookups.clear()

      // Chunk into batches of BATCH_MAX so very large mention waves still work.
      for (let i = 0; i < all.length; i += BATCH_MAX) {
        const batch = all.slice(i, i + BATCH_MAX)
        for (const un of batch) inFlight.add(un)
        try {
          const res = await apiFetchData<{ results: UserPreviewBatchEntry[] }>(
            '/users/preview/batch',
            { method: 'POST', body: { usernames: batch } },
          )
          const results = res?.results ?? []
          const seen = new Set<string>()
          for (const entry of results) {
            const un = (entry.username ?? '').toLowerCase().trim()
            if (!un) continue
            seen.add(un)
            if (entry.id) {
              _pendingValid.add(un)
              const tier = userColorTier(entry as TierLike)
              if (tier !== 'normal' || tierMap.value.has(un)) _pendingTier.set(un, tier)
            } else {
              invalidSet.value.add(un)
            }
          }
          // Anything in the batch that the server didn't echo back counts as invalid.
          for (const un of batch) {
            if (!seen.has(un)) invalidSet.value.add(un)
          }
          flushReactive()
        } catch {
          // Network failure — treat as transient: don't poison the invalid cache.
          // Future renders will retry on the next mention scan.
        } finally {
          for (const un of batch) inFlight.delete(un)
        }
      }
    }

    // Wait one animation frame so a single chat-mount mention-scan wave
    // collapses into ONE request rather than fanning out per row.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => { void dispatch() })
    } else {
      setTimeout(() => { void dispatch() }, 0)
    }
  }

  function enqueueLookup(username: string) {
    const un = (username ?? '').toLowerCase().trim()
    if (!un) return
    if (validSet.value.has(un)) return
    if (invalidSet.value.has(un)) return
    if (inFlight.has(un)) return
    if (_pendingLookups.has(un)) return
    _pendingLookups.add(un)
    flushLookups()
  }

  /**
   * Scan a chat message body for @mentions and kick off background validation
   * for any username not already in knownUsernames.
   */
  function validateMentionsInBody(body: string, knownUsernames: ReadonlySet<string>) {
    if (!import.meta.client || !body) return
    for (const m of body.matchAll(MENTION_RE)) {
      const un = m[1]!.toLowerCase()
      if (!knownUsernames.has(un)) enqueueLookup(un)
    }
  }

  return { validSet: readonly(validSet), tierMap: readonly(tierMap), tierForUsername, markValid, validateMentionsInBody }
}
