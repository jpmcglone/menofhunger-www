import type { FollowRelationship } from '~/types/api'

/**
 * Merge an incoming list/socket relationship into one we already know.
 *
 * Broadcast presence payloads used to ship `viewerFollowsUser: false` for
 * everyone (no viewer on the emit). Never let that clobber a known follow.
 */
export function hydrateFollowRelationship(
  existing: FollowRelationship | null | undefined,
  incoming: FollowRelationship | null | undefined,
): FollowRelationship | null {
  if (!incoming) return existing ?? null
  if (existing?.viewerFollowsUser && !incoming.viewerFollowsUser) return existing
  return incoming
}
