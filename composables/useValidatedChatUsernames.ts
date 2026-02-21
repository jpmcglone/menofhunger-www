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

export function useValidatedChatUsernames() {
  const { apiFetchData } = useApiClient()

  // Usernames confirmed to exist.
  const validSet = useState<Set<string>>('chat-validated-usernames', () => new Set())
  // Negative cache: confirmed not found. Prevents re-fetching 404s.
  const invalidSet = useState<Set<string>>('chat-invalid-usernames', () => new Set())
  // In-flight lookups — deduplicate concurrent requests.
  const pending = useState<Set<string>>('chat-pending-usernames', () => new Set())
  // Tier per username — populated alongside validation. Enables colored @mention rendering.
  const tierMap = useState<Map<string, UserColorTier>>('chat-username-tiers', () => new Map())

  function storeTier(un: string, tier: UserColorTier) {
    if (tier === 'normal' && !tierMap.value.has(un)) return // don't bother storing the default
    const next = new Map(tierMap.value)
    next.set(un, tier)
    tierMap.value = next
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
    if (tierData) storeTier(un, userColorTier(tierData))
  }

  /** Returns the cached tier for a username, or 'normal' if unknown. */
  function tierForUsername(username: string): UserColorTier {
    return tierMap.value.get((username ?? '').toLowerCase().trim()) ?? 'normal'
  }

  async function lookupOne(username: string) {
    const un = username.toLowerCase().trim()
    if (!un) return
    if (validSet.value.has(un) || invalidSet.value.has(un) || pending.value.has(un)) return

    pending.value = new Set([...pending.value, un])
    try {
      const data = await apiFetchData<TierLike & { id?: string }>(
        `/users/${encodeURIComponent(un)}/preview`,
        { method: 'GET' },
      )
      if (data?.id) {
        if (!validSet.value.has(un)) {
          validSet.value = new Set([...validSet.value, un])
        }
        storeTier(un, userColorTier(data))
      } else {
        invalidSet.value = new Set([...invalidSet.value, un])
      }
    } catch {
      invalidSet.value = new Set([...invalidSet.value, un])
    } finally {
      const next = new Set(pending.value)
      next.delete(un)
      pending.value = next
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
