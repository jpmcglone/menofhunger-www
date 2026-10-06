export type ActivityBadge = { kind: 'count'; count: number } | { kind: 'dot' } | { kind: 'hidden' }

export function activityBadge(count: number, hasUnread = false): ActivityBadge {
  const value = Math.max(0, Math.floor(Number(count) || 0))
  return value > 0 ? { kind: 'count', count: value } : hasUnread ? { kind: 'dot' } : { kind: 'hidden' }
}
