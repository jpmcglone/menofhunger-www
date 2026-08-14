import { spaceDisplayTitle, type SpaceDisplayInput } from '~/utils/space-display'

type SpaceTitleInput = SpaceDisplayInput & { watchPartyUrl?: string | null }

/** Server playback title first; YouTube oEmbed when a live watch party has none. */
export function useSpaceDisplayTitle(space: MaybeRefOrGetter<SpaceTitleInput | null | undefined>) {
  const oembedUrl = computed(() => {
    const s = toValue(space)
    if (!s?.isActive || s.mode !== 'WATCH_PARTY') return null
    if (s.playbackTitle?.trim()) return null
    return s.watchPartyUrl ?? null
  })
  const oembedTitle = useYouTubeOEmbedTitle(oembedUrl)

  return computed(() => {
    const s = toValue(space)
    if (!s) return ''
    return spaceDisplayTitle(s, { playbackTitleOverride: oembedTitle.value })
  })
}
