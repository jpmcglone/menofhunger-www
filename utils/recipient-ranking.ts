import type { FollowListUser } from '~/types/api'

/** A user that may carry extra context about recent DM activity. */
export type RankableRecipient = FollowListUser & {
  /** When set, this user came from a recent DM conversation (lower index = more recent). */
  recentDmIndex?: number
}

/**
 * Rank recipients for the "Send via chat" picker.
 *
 * Priority:
 *   1. Recent DM (preserve conversation order — most recent first)
 *   2. Mutual follow (viewerFollowsUser AND userFollowsViewer)
 *   3. I follow them (viewerFollowsUser)
 *   4. They follow me (userFollowsViewer)
 *   5. Everyone else
 *
 * Within each tier, original order is preserved.
 */
export function rankRecipients(users: RankableRecipient[]): RankableRecipient[] {
  const tier = (u: RankableRecipient): number => {
    if (typeof u.recentDmIndex === 'number') return 0
    const vf = u.relationship?.viewerFollowsUser ?? false
    const uf = u.relationship?.userFollowsViewer ?? false
    if (vf && uf) return 1
    if (vf) return 2
    if (uf) return 3
    return 4
  }

  return [...users].sort((a, b) => {
    const ta = tier(a)
    const tb = tier(b)
    if (ta !== tb) return ta - tb
    // Within tier 0, sort by most recent DM first (lower index = more recent).
    if (ta === 0 && typeof a.recentDmIndex === 'number' && typeof b.recentDmIndex === 'number') {
      return a.recentDmIndex - b.recentDmIndex
    }
    return 0
  })
}

/** Deduplicate a list of RankableRecipients by id, keeping the first occurrence. */
export function dedupeRecipients(users: RankableRecipient[]): RankableRecipient[] {
  const seen = new Set<string>()
  return users.filter((u) => {
    if (seen.has(u.id)) return false
    seen.add(u.id)
    return true
  })
}
