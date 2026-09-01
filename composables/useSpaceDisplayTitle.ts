import { spaceDisplaySubtitle, spaceDisplayTitle, type SpaceDisplayInput } from '~/utils/space-display'

type SpaceTitleInput = SpaceDisplayInput & { watchPartyUrl?: string | null }

function useSpacePlaybackOverride(space: MaybeRefOrGetter<SpaceTitleInput | null | undefined>) {
  const oembedUrl = computed(() => {
    const s = toValue(space)
    if (!s || s.mode !== 'WATCH_PARTY') return null
    if (s.playbackTitle?.trim()) return null
    return s.watchPartyUrl ?? null
  })
  return useYouTubeOEmbedTitle(oembedUrl)
}

/** Server playback title first; YouTube oEmbed when a watch-party URL has none. */
export function useSpaceDisplayTitle(space: MaybeRefOrGetter<SpaceTitleInput | null | undefined>) {
  const oembedTitle = useSpacePlaybackOverride(space)
  return computed(() => {
    const s = toValue(space)
    if (!s) return ''
    return spaceDisplayTitle(s, { playbackTitleOverride: oembedTitle.value })
  })
}

export function useSpaceDisplaySubtitle(space: MaybeRefOrGetter<SpaceTitleInput | null | undefined>) {
  const oembedTitle = useSpacePlaybackOverride(space)
  return computed(() => {
    const s = toValue(space)
    if (!s) return null
    return spaceDisplaySubtitle(s, { playbackTitleOverride: oembedTitle.value })
  })
}
