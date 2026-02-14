import type { UserColorTier } from '~/utils/user-tier'
import { userTierColorVar } from '~/utils/user-tier'

type MentionTierLike = UserColorTier

export function mentionTierToColorVar(tier: MentionTierLike | undefined): string | null {
  return tier ? userTierColorVar(tier) : null
}

export function mentionTierToStyle(tier: MentionTierLike | undefined): Record<string, string> | undefined {
  const color = mentionTierToColorVar(tier)
  return color ? { color } : undefined
}

