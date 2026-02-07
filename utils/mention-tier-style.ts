type MentionTierLike = 'normal' | 'verified' | 'premium'

export function mentionTierToColorVar(tier: MentionTierLike | undefined): string | null {
  if (tier === 'premium') return 'var(--moh-premium)'
  if (tier === 'verified') return 'var(--moh-verified)'
  return null
}

export function mentionTierToStyle(tier: MentionTierLike | undefined): Record<string, string> | undefined {
  const color = mentionTierToColorVar(tier)
  return color ? { color } : undefined
}

