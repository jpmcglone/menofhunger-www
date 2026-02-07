import { segmentBodyWithMentions, type BodySegment } from '~/utils/mention-autocomplete'

type MentionTierLike = 'normal' | 'verified' | 'premium'

export type ComposerBodySegment = BodySegment & { tier?: MentionTierLike }

/**
 * Shared composer mirror segmentation:
 * - splits text into text + mention tokens
 * - applies tier color either from the currently highlighted suggestion (active token),
 *   or from previously-selected mentions in this session (mentionTiers map)
 */
export function segmentComposerBodyWithMentionTiers(args: {
  text: string
  mentionTiers: Record<string, MentionTierLike>
  activeAtIndex?: number | null
  highlightedTier?: MentionTierLike | null
}): ComposerBodySegment[] {
  const text = (args.text ?? '').toString()
  const segments = segmentBodyWithMentions(text)
  const tiers = args.mentionTiers ?? {}
  const activeAtIndex = typeof args.activeAtIndex === 'number' ? args.activeAtIndex : null
  const highlightedTier = args.highlightedTier ?? null

  let pos = 0
  return segments.map((seg) => {
    const start = pos
    pos += seg.value.length

    if (seg.type !== 'mention') return seg

    const usernameLower = (seg.value.slice(1) || '').toLowerCase()
    const tier: MentionTierLike | undefined =
      activeAtIndex != null && start === activeAtIndex && highlightedTier
        ? highlightedTier
        : (tiers[usernameLower] ?? 'normal')

    return { ...seg, tier }
  })
}

