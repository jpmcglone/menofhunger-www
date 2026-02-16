import type { ComputedRef, Ref } from 'vue'
import type { FeedPost } from '~/types/api'
import type { LinkMetadata } from '~/utils/link-metadata'
import { siteConfig } from '~/config/site'
import { safeUrlHostname } from '~/utils/link-utils'
import { excerpt } from '~/utils/text'

export type PostPermalinkPrimaryMedia = {
  url?: string | null
  thumbnailUrl?: string | null
  kind?: string | null
  width?: number | null
  height?: number | null
}

export type PostPermalinkPrimaryVideo = {
  url: string
  mp4Url?: string | null
  width?: number | null
  height?: number | null
}

export function usePostPermalinkSeo(opts: {
  postId: ComputedRef<string>
  post: Ref<FeedPost | null>
  errorText: Ref<string | null>
  isRestricted: ComputedRef<boolean>
  restrictionLabel: ComputedRef<string>
  restrictionSeoDescription: ComputedRef<string>
  previewLink: ComputedRef<string | null>
  linkMeta: ComputedRef<LinkMetadata | null>
  primaryMedia: ComputedRef<PostPermalinkPrimaryMedia | null | undefined>
  extraOgMediaUrls: ComputedRef<string[]>
  /** Primary video for og:video / twitter:player (first video in post media). */
  primaryVideo?: ComputedRef<PostPermalinkPrimaryVideo | null>
  bodyTextSansLinks: ComputedRef<string>
}) {
  const canonicalPath = computed(() => `/p/${encodeURIComponent(opts.postId.value)}`)

  const pollMeta = computed(() => {
    const p = opts.post.value
    if (!p || opts.isRestricted.value) return null
    const poll = (p as any).poll as FeedPost['poll'] | null | undefined
    if (!poll) return null
    const totalVoteCount = Number((poll as any).totalVoteCount ?? 0) || 0
    const ended = Boolean((poll as any).ended)
    const endsAt = (poll as any).endsAt ? new Date((poll as any).endsAt) : null
    const endsAtText =
      endsAt && !Number.isNaN(endsAt.getTime())
        ? ended
          ? 'Done'
          : `Ends ${endsAt.toLocaleString()}`
        : null
    const firstOptionImage =
      ((poll as any).options as Array<{ imageUrl?: string | null }> | undefined)
        ?.map((o) => (o?.imageUrl ?? '').trim())
        .find(Boolean) ?? null
    return { totalVoteCount, ended, endsAtText, firstOptionImage }
  })

  const seoTitle = computed(() => {
    if (!opts.post.value) return opts.isRestricted.value ? opts.restrictionLabel.value : 'Post'
    if (opts.isRestricted.value) return opts.restrictionLabel.value

    const username = (opts.post.value.author.username ?? '').trim()
    const bodyText = (opts.bodyTextSansLinks.value ?? '').trim()
    const hasBodyText = Boolean(bodyText)

    // Poll: identity-first, with "Poll:" prefix for clarity in SERPs and share cards.
    if (pollMeta.value) {
      if (hasBodyText) {
        const t = excerpt(bodyText, 56)
        return username ? `Poll: ${t} — @${username}` : `Poll: ${t}`
      }
      return username ? `Poll by @${username}` : 'Poll'
    }

    // Media post: preview the media.
    if (opts.primaryMedia.value) {
      if (hasBodyText) {
        const t = excerpt(bodyText, 56)
        return username ? `${t} — @${username}` : t
      }
      const kind = opts.primaryMedia.value.kind === 'gif' ? 'GIF' : opts.primaryMedia.value.kind === 'video' ? 'Video' : 'Photo'
      return username ? `${kind} by @${username}` : kind
    }

    // External link share: preview the link.
    const external = (opts.previewLink.value ?? '').trim()
    if (external) {
      const isLinkOnly = !hasBodyText
      if (isLinkOnly) {
        const linkTitle = (opts.linkMeta.value?.title ?? '').trim()
        const host = safeUrlHostname(external) ?? 'Link'
        const t = linkTitle || host
        return username ? `${t} — shared by @${username}` : t
      }
      const t = excerpt(bodyText, 56)
      return username ? `${t} — @${username}` : t
    }

    // Text-only: identity-first.
    const t = hasBodyText ? excerpt(bodyText, 56) : 'Post'
    return username ? `${t} — @${username}` : t
  })

  const seoDescription = computed(() => {
    if (!opts.post.value) {
      if (!opts.isRestricted.value) return 'Post.'
      return opts.restrictionSeoDescription.value
    }
    if (opts.isRestricted.value) {
      return opts.restrictionSeoDescription.value
    }

    const username = (opts.post.value.author.username ?? '').trim()
    const bodyText = (opts.bodyTextSansLinks.value ?? '').trim()
    const hasBodyText = Boolean(bodyText)

    if (pollMeta.value) {
      const votes = pollMeta.value.totalVoteCount
      const votesLabel = `${votes} vote${votes === 1 ? '' : 's'}`
      const endsAtText = (pollMeta.value.endsAtText ?? '').trim()
      const prefix = endsAtText ? `Poll · ${votesLabel} · ${endsAtText}` : `Poll · ${votesLabel}`
      const main = hasBodyText ? excerpt(bodyText, 190) : username ? `Poll by @${username}.` : 'Poll.'
      return excerpt(`${prefix} — ${main}`, 190) || 'Poll.'
    }

    if (opts.primaryMedia.value) {
      if (hasBodyText) return excerpt(bodyText, 190)
      return username ? `Post by @${username}.` : 'Post.'
    }

    const external = (opts.previewLink.value ?? '').trim()
    if (external) {
      const isLinkOnly = !hasBodyText
      if (isLinkOnly) {
        const d = (opts.linkMeta.value?.description ?? '').trim()
        if (d) return excerpt(d, 190)
        const site = (opts.linkMeta.value?.siteName ?? '').trim()
        return site ? `From ${site}.` : 'Shared link.'
      }

      let d = excerpt(bodyText, 190)
      const linkDesc = (opts.linkMeta.value?.description ?? '').trim()
      if (linkDesc && d.length < 130) {
        const remaining = Math.max(0, 190 - d.length - 3)
        if (remaining >= 24) d = `${d} — ${excerpt(linkDesc, remaining)}`
      }
      return d || 'Post.'
    }

    return hasBodyText ? excerpt(bodyText, 190) : 'Post.'
  })

  const seoAuthor = computed(() => {
    if (!opts.post.value || opts.isRestricted.value) return siteConfig.name
    const username = (opts.post.value.author.username ?? '').trim()
    return username ? `@${username}` : siteConfig.name
  })

  const seoImage = computed(() => {
    if (opts.isRestricted.value) return '/images/logo-black-bg.png'

    // Content-first: for video use thumbnail (poster) so og:image is an image; else use media url.
    const primary = opts.primaryMedia.value
    const posterUrl = (primary?.thumbnailUrl ?? '').trim()
    const mediaUrl = (primary?.url ?? '').trim()
    if (posterUrl) return posterUrl
    if (mediaUrl) return mediaUrl

    // External link unfurl image.
    const linkImage = (opts.linkMeta.value?.imageUrl ?? '').trim()
    if (linkImage) return linkImage

    // Poll option image (if present) makes for a better unfurl than the author's avatar.
    const pollImage = (pollMeta.value?.firstOptionImage ?? '').trim()
    if (pollImage) return pollImage

    // Identity-first baseline for text-only (and as fallback for link shares with no image).
    const avatar = (opts.post.value?.author.avatarUrl ?? '').trim()
    return avatar || '/images/banner.png'
  })

  const seoImageAlt = computed(() => {
    if (opts.isRestricted.value) return `${siteConfig.name} logo`
    const username = (opts.post.value?.author.username ?? '').trim()
    const bodyText = (opts.bodyTextSansLinks.value ?? '').trim()
    const external = (opts.previewLink.value ?? '').trim()

    if (pollMeta.value) {
      if (bodyText) return `Poll: ${excerpt(bodyText, 120)}`
      return username ? `Poll by @${username}` : `Poll on ${siteConfig.name}`
    }

    if (opts.primaryMedia.value) {
      if (bodyText) return excerpt(bodyText, 120)
      const kind = opts.primaryMedia.value.kind === 'gif' ? 'GIF' : opts.primaryMedia.value.kind === 'video' ? 'Video' : 'Photo'
      return username ? `${kind} by @${username}` : `${kind} on ${siteConfig.name}`
    }
    if (external) {
      const t = (opts.linkMeta.value?.title ?? '').trim()
      return t ? `Shared link: ${t}` : username ? `Shared link by @${username}` : `Shared link on ${siteConfig.name}`
    }
    return username ? `Post by @${username}` : `Post on ${siteConfig.name}`
  })

  function toAbs(pathOrUrl: string) {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
    return `${siteConfig.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
  }

  const jsonLdGraph = computed(() => {
    if (!opts.post.value || opts.isRestricted.value) return []

    const username = (opts.post.value.author.username ?? '').trim()
    const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
    const authorId = authorUrl ? `${authorUrl}#person` : `${siteConfig.url}/#organization`
    const avatarUrl = (opts.post.value.author.avatarUrl ?? '').trim() || null
    const author: any = authorUrl
      ? {
          '@type': 'Person',
          '@id': authorId,
          name: username ? `@${username}` : siteConfig.name,
          url: authorUrl,
          ...(avatarUrl ? { image: avatarUrl } : {})
        }
      : { '@type': 'Organization', '@id': `${siteConfig.url}/#organization`, name: siteConfig.name, url: siteConfig.url }

    const images: string[] = []
    const primary = opts.primaryMedia.value
    const primaryImgUrl = (primary?.thumbnailUrl ?? primary?.url ?? '').trim()
    if (primaryImgUrl) images.push(toAbs(primaryImgUrl))
    const primaryMediaUrl = (primary?.url ?? '').trim()
    if (primaryMediaUrl && primaryMediaUrl !== primaryImgUrl) images.push(toAbs(primaryMediaUrl))
    for (const u of opts.extraOgMediaUrls.value) images.push(toAbs(u))
    const linkImage = (opts.linkMeta.value?.imageUrl ?? '').trim()
    if (!images.length && linkImage) images.push(toAbs(linkImage))
    const pollImage = (pollMeta.value?.firstOptionImage ?? '').trim()
    if (!images.length && pollImage) images.push(toAbs(pollImage))
    if (!images.length && avatarUrl) images.push(toAbs(avatarUrl))
    // Always include a site fallback at the end.
    images.push(toAbs('/images/banner.png'))

    const headlineBase = excerpt(opts.bodyTextSansLinks.value || 'Post', 90)
    const headline = pollMeta.value ? `Poll: ${headlineBase}` : headlineBase
    const article: any = {
      '@type': 'Article',
      '@id': `${siteConfig.url}${canonicalPath.value}#article`,
      mainEntityOfPage: { '@id': `${siteConfig.url}${canonicalPath.value}#webpage` },
      headline,
      description: seoDescription.value,
      datePublished: opts.post.value.createdAt,
      dateModified: opts.post.value.createdAt,
      author: { '@id': authorId },
      publisher: { '@id': `${siteConfig.url}/#organization` },
      image: Array.from(new Set(images)).filter(Boolean),
      isAccessibleForFree: true,
    }
    if (pollMeta.value) {
      const votes = pollMeta.value.totalVoteCount
      article.about = [{ '@type': 'Thing', name: 'Poll' }]
      article.interactionStatistic = [
        {
          '@type': 'InteractionCounter',
          interactionType: 'http://schema.org/VoteAction',
          userInteractionCount: votes,
        },
      ]
    }
    const video = opts.primaryVideo?.value
    if (video) {
      const videoUrl = toAbs((video.url ?? '').trim())
      if (videoUrl) {
        article.video = {
          '@type': 'VideoObject',
          contentUrl: video.mp4Url ? toAbs(video.mp4Url) : videoUrl,
          url: videoUrl,
          ...(video.width != null && video.height != null ? { width: video.width, height: video.height } : {}),
        }
      }
    }
    return [authorUrl ? author : null, article].filter(Boolean)
  })

  const seoImageWidth = computed(() => opts.primaryMedia.value?.width ?? undefined)
  const seoImageHeight = computed(() => opts.primaryMedia.value?.height ?? undefined)

  usePageSeo({
    title: seoTitle,
    description: seoDescription,
    canonicalPath,
    ogType: computed(() => (opts.isRestricted.value ? 'website' : 'article')),
    image: seoImage,
    imageAlt: seoImageAlt,
    imageWidth: seoImageWidth,
    imageHeight: seoImageHeight,
    noindex: computed(() => opts.isRestricted.value || Boolean(opts.errorText.value)),
    author: seoAuthor,
    jsonLdGraph
  })

  // Extra share tags for article rich previews (public posts only): article meta, og:image dimensions, og:video, twitter:player.
  useHead({
    meta: computed(() => {
      if (!opts.post.value || opts.isRestricted.value) return []
      const username = (opts.post.value.author.username ?? '').trim()
      const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
      const meta: Array<{ property?: string; name?: string; content: string }> = [
        { property: 'article:published_time', content: opts.post.value.createdAt },
        { property: 'article:modified_time', content: opts.post.value.createdAt },
        ...(authorUrl ? [{ property: 'article:author', content: authorUrl }] : []),
        ...(pollMeta.value ? [{ property: 'article:tag', content: 'Poll' }] : []),
        // Multiple images: add extra OG images so platforms can pick/rotate (images, GIFs).
        ...opts.extraOgMediaUrls.value.map((u) => ({ property: 'og:image', content: toAbs(u) })),
      ]
      // Video: og:video and twitter:player for rich video previews.
      const video = opts.primaryVideo?.value
      if (video) {
        const videoUrl = (video.url ?? '').trim()
        if (videoUrl) {
          const absVideoUrl = toAbs(videoUrl)
          meta.push({ property: 'og:video', content: absVideoUrl })
          meta.push({ property: 'og:video:url', content: absVideoUrl })
          meta.push({ property: 'og:video:type', content: 'video/mp4' })
          if (video.width != null && video.width > 0 && video.height != null && video.height > 0) {
            meta.push({ property: 'og:video:width', content: String(video.width) })
            meta.push({ property: 'og:video:height', content: String(video.height) })
          }
          meta.push({ name: 'twitter:player', content: absVideoUrl })
          if (video.width != null && video.height != null) {
            meta.push({ name: 'twitter:player:width', content: String(video.width) })
            meta.push({ name: 'twitter:player:height', content: String(video.height) })
          }
        }
      }
      return meta
    }),
  })
}

