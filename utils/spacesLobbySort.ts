import type { Space } from '~/types/api'

/**
 * Lobby list order (mirrors API `compareLobbySpaces`):
 * 1. viewer's own space
 * 2. spaces the viewer is notified about
 * 3. spaces owned by people the viewer follows
 * 4. live rooms by listener count
 * 5. soonest upcoming schedule (unscheduled last)
 */
export function compareLobbySpaces(
  a: Space,
  b: Space,
  viewerId: string | null | undefined,
): number {
  const vid = String(viewerId ?? '').trim() || null
  const aOwn = vid && a.owner?.id === vid ? 1 : 0
  const bOwn = vid && b.owner?.id === vid ? 1 : 0
  if (aOwn !== bOwn) return bOwn - aOwn

  const aSub = a.viewerSubscribed ? 1 : 0
  const bSub = b.viewerSubscribed ? 1 : 0
  if (aSub !== bSub) return bSub - aSub

  const aFollow = a.viewerFollowsOwner ? 1 : 0
  const bFollow = b.viewerFollowsOwner ? 1 : 0
  if (aFollow !== bFollow) return bFollow - aFollow

  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
  if (a.isActive && b.isActive) return (b.listenerCount ?? 0) - (a.listenerCount ?? 0)

  const aAt = a.scheduledAt ? Date.parse(a.scheduledAt) : Number.POSITIVE_INFINITY
  const bAt = b.scheduledAt ? Date.parse(b.scheduledAt) : Number.POSITIVE_INFINITY
  const aSched = Number.isFinite(aAt) ? aAt : Number.POSITIVE_INFINITY
  const bSched = Number.isFinite(bAt) ? bAt : Number.POSITIVE_INFINITY
  if (aSched !== bSched) return aSched - bSched
  return a.id.localeCompare(b.id)
}

/** Keep live rooms the server omitted so a lobby refresh cannot fade them out. */
export function mergeLobbyRefresh(remote: Space[], previous: Space[]): Space[] {
  const ids = new Set(remote.map((s) => s.id))
  const keepLive = previous.filter((s) => s.isActive && !ids.has(s.id))
  return keepLive.length ? [...remote, ...keepLive] : remote
}

export function sortLobbySpaces(spaces: Space[], viewerId: string | null | undefined): Space[] {
  return [...spaces].sort((a, b) => compareLobbySpaces(a, b, viewerId))
}

/** Upcoming scheduled space the viewer has Notify-me (or host reminders) on. */
export function isScheduledNotifySpace(space: Space, nowMs = Date.now()): boolean {
  if (!space.viewerSubscribed) return false
  if (space.isActive) return false
  if (!space.scheduledAt) return false
  const at = Date.parse(space.scheduledAt)
  return Number.isFinite(at) && at > nowMs
}
