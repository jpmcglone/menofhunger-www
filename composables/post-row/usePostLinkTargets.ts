import { extractLinksFromText, extractMohPostId, extractMohArticleId, extractMohSpaceId, extractMohSpaceUsername, isMohSpaceLink, extractMohUsername } from '~/utils/link-utils'

export type PostLinkPreviewInput = {
  body: string
  hasMedia: boolean
  rowInView: boolean
}

/** Which links in a post body become embeds (post, article, space, user) and which one is the preview link. */
export function usePostLinkTargets(props: PostLinkPreviewInput) {
  const body = computed(() => (props.body ?? '').toString())
  const hasMedia = computed(() => Boolean(props.hasMedia))
  const rowInView = computed(() => Boolean(props.rowInView))

  const capturedLinks = computed(() => extractLinksFromText(body.value))

  const embeddedPostLink = computed(() => {
    const xs = capturedLinks.value
    for (let i = xs.length - 1; i >= 0; i--) {
      const u = xs[i]
      if (u && extractMohPostId(u)) return u
    }
    return null
  })

  const embeddedPostId = computed(() => (embeddedPostLink.value ? extractMohPostId(embeddedPostLink.value) : null))

  const embeddedArticleLink = computed(() => {
    const xs = capturedLinks.value
    for (let i = xs.length - 1; i >= 0; i--) {
      const u = xs[i]
      if (u && extractMohArticleId(u)) return u
    }
    return null
  })

  const embeddedArticleId = computed(() => (embeddedArticleLink.value ? extractMohArticleId(embeddedArticleLink.value) : null))

  const embeddedSpaceLink = computed(() => {
    const xs = capturedLinks.value
    for (let i = xs.length - 1; i >= 0; i--) {
      const u = xs[i]
      if (u && isMohSpaceLink(u)) return u
    }
    return null
  })

  const embeddedSpaceId = computed(() => (embeddedSpaceLink.value ? extractMohSpaceId(embeddedSpaceLink.value) : null))
  const embeddedSpaceUsername = computed(() => (embeddedSpaceLink.value ? extractMohSpaceUsername(embeddedSpaceLink.value) : null))
  const hasEmbeddedSpace = computed(() => Boolean(embeddedSpaceId.value || embeddedSpaceUsername.value))

  const embeddedUserLink = computed(() => {
    const xs = capturedLinks.value
    for (let i = xs.length - 1; i >= 0; i--) {
      const u = xs[i]
      if (u && extractMohUsername(u)) return u
    }
    return null
  })

  const embeddedUsername = computed(() => (embeddedUserLink.value ? extractMohUsername(embeddedUserLink.value) : null))

  const previewLink = computed(() => {
    const xs = capturedLinks.value
    for (let i = xs.length - 1; i >= 0; i--) {
      const u = xs[i]
      if (!u) continue
      if (extractMohPostId(u)) continue
      if (extractMohArticleId(u)) continue
      if (isMohSpaceLink(u)) continue
      if (extractMohUsername(u)) continue
      return u
    }
    return null
  })

  const showLinkPreview = computed(() => Boolean(previewLink.value && !hasMedia.value))

  return {
    body, hasMedia, rowInView, capturedLinks,
    embeddedPostId, embeddedArticleId, embeddedSpaceId, embeddedSpaceUsername, hasEmbeddedSpace,
    embeddedUsername, previewLink, showLinkPreview,
  }
}

export type PostLinkTargets = ReturnType<typeof usePostLinkTargets>
