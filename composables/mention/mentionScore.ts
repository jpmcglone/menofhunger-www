import type { FollowListUser } from '~/types/api'
import { extractMentionedUsernames } from '~/utils/mention-autocomplete'
import { userColorTier } from '~/utils/user-tier'

export type MentionUser = FollowListUser
export type MentionTier = 'organization' | 'premium' | 'verified' | 'normal'

export function normalizeMentionQuery(s: string): string {
  return (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
}

export function clampMention(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function mentionRelationshipRank(u: MentionUser): number {
  const rel = u.relationship
  const vf = Boolean(rel?.viewerFollowsUser)
  const fv = Boolean(rel?.userFollowsViewer)
  if (vf && fv) return 0
  if (vf) return 1
  if (fv) return 2
  return 3
}

export function tierFromMentionUser(u: { isOrganization?: boolean; premium?: boolean; premiumPlus?: boolean; verifiedStatus?: string } | null): MentionTier {
  return userColorTier(u)
}

export function scoreUsernameMode(u: MentionUser, q: string): number {
  const qLower = normalizeMentionQuery(q)
  const un = normalizeMentionQuery(u.username ?? '')
  const nm = normalizeMentionQuery(u.name ?? '')
  if (!qLower) return 0
  if (un && un === qLower) return 120
  if (un && un.startsWith(qLower)) return 110
  if (nm && nm === qLower) return 80
  if (nm && nm.startsWith(qLower)) return 70
  if (un && un.includes(qLower)) return 60
  if (nm && nm.includes(qLower)) return 50
  return 0
}

export function rerankMentions(
  list: MentionUser[],
  q: string,
  draftText: string,
  contextUsernames: string[] = [],
): MentionUser[] {
  const qLower = normalizeMentionQuery(q)
  const context = new Set<string>()
  for (const un of extractMentionedUsernames(draftText)) context.add(un)
  for (const un of contextUsernames.map((s) => normalizeMentionQuery(s)).filter(Boolean)) context.add(un)

  const scored = list.map((u, idx) => {
    const base = scoreUsernameMode(u, qLower)
    const rel = mentionRelationshipRank(u)
    const relBonus = rel === 0 ? 3 : rel === 1 ? 2 : rel === 2 ? 1 : 0
    const ctxBonus = u.username && context.has(normalizeMentionQuery(u.username)) ? 2 : 0
    return { u, idx, score: base * 10 + relBonus + ctxBonus, rel }
  })

  const filtered = scored.filter((s) => (qLower ? scoreUsernameMode(s.u, qLower) > 0 : true))
  filtered.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    if (a.rel !== b.rel) return a.rel - b.rel
    return a.idx - b.idx
  })
  return filtered.map((s) => s.u)
}
