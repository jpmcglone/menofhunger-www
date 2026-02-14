import { segmentBodyWithMentions, type BodySegment } from '~/utils/mention-autocomplete'
import { splitTextByHashtagsDisplay } from '~/utils/hashtag-autocomplete'

type MentionTierLike = 'normal' | 'verified' | 'premium' | 'organization'

export type ComposerBodySegment =
  | (BodySegment & { tier?: MentionTierLike })
  | ({ type: 'hashtag'; value: string } & { tier?: MentionTierLike })

/**
 * Shared composer mirror segmentation:
 * - splits text into text + mention tokens
 * - applies tier color either from the currently highlighted suggestion (active token),
 *   or from previously-selected mentions in this session (mentionTiers map)
 */
export function segmentComposerBodyWithMentionAndHashtagTiers(args: {
  text: string
  mentionTiers: Record<string, MentionTierLike>
  activeAtIndex?: number | null
  highlightedTier?: MentionTierLike | null
  hashtagTier?: MentionTierLike
}): ComposerBodySegment[] {
  const text = (args.text ?? '').toString()
  const segments = segmentBodyWithMentions(text)
  const tiers = args.mentionTiers ?? {}
  const activeAtIndex = typeof args.activeAtIndex === 'number' ? args.activeAtIndex : null
  const highlightedTier = args.highlightedTier ?? null
  const hashtagTier = args.hashtagTier ?? 'normal'

  let pos = 0
  const out: ComposerBodySegment[] = []
  for (const seg of segments) {
    const start = pos
    pos += seg.value.length

    if (seg.type !== 'mention') {
      // Split plain text further by hashtags so mirror can tint them too.
      const hs = splitTextByHashtagsDisplay(seg.value)
      for (const h of hs) {
        if (!h.hashtag) out.push({ type: 'text', value: h.text })
        else out.push({ type: 'hashtag', value: h.hashtag.raw, tier: hashtagTier })
      }
      continue
    }

    const usernameLower = (seg.value.slice(1) || '').toLowerCase()
    const tier: MentionTierLike | undefined =
      activeAtIndex != null && start === activeAtIndex && highlightedTier
        ? highlightedTier
        : (tiers[usernameLower] ?? 'normal')

    out.push({ ...seg, tier })
  }
  return out
}

