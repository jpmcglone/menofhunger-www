import type { ComputedRef, Ref } from 'vue'
import type { FeedPost } from '~/types/api'
import type { LinkMetadata } from '~/utils/link-metadata'
import { siteConfig } from '~/config/site'
import { safeUrlHostname } from '~/utils/link-utils'
import { excerpt } from '~/utils/text'

export function usePostPermalinkSeo(opts: {
  postId: ComputedRef<string>
  post: Ref<FeedPost | null>
  errorText: Ref<string | null>
  isRestricted: ComputedRef<boolean>
  restrictionLabel: ComputedRef<string>
  restrictionSeoDescription: ComputedRef<string>
  previewLink: ComputedRef<string | null>
  linkMeta: ComputedRef<LinkMetadata | null>
  primaryMedia: ComputedRef<{ url?: string | null; kind?: string | null } | null | undefined>
  extraOgMediaUrls: ComputedRef<string[]>
  bodyTextSansLinks: ComputedRef<string>
}) {
  const canonicalPath = computed(() => `/p/${encodeURIComponent(opts.postId.value)}`)

  const seoTitle = computed(() => {
    if (!opts.post.value) return opts.isRestricted.value ? opts.restrictionLabel.value : 'Post'
    if (opts.isRestricted.value) return opts.restrictionLabel.value

    const username = (opts.post.value.author.username ?? '').trim()
    const bodyText = (opts.bodyTextSansLinks.value ?? '').trim()
    const hasBodyText = Boolean(bodyText)

    // Media post: preview the media.
    if (opts.primaryMedia.value) {
      if (hasBodyText) {
        const t = excerpt(bodyText, 56)
        return username ? `${t} — @${username}` : t
      }
      const kind = opts.primaryMedia.value.kind === 'gif' ? 'GIF' : 'Photo'
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

    // Content-first: media wins.
    const mediaUrl = (opts.primaryMedia.value?.url ?? '').trim()
    if (mediaUrl) return mediaUrl

    // External link unfurl image.
    const linkImage = (opts.linkMeta.value?.imageUrl ?? '').trim()
    if (linkImage) return linkImage

    // Identity-first baseline for text-only (and as fallback for link shares with no image).
    const avatar = (opts.post.value?.author.avatarUrl ?? '').trim()
    return avatar || '/images/banner.png'
  })

  const seoImageAlt = computed(() => {
    if (opts.isRestricted.value) return `${siteConfig.name} logo`
    const username = (opts.post.value?.author.username ?? '').trim()
    const bodyText = (opts.bodyTextSansLinks.value ?? '').trim()
    const external = (opts.previewLink.value ?? '').trim()

    if (opts.primaryMedia.value) {
      if (bodyText) return excerpt(bodyText, 120)
      const kind = opts.primaryMedia.value.kind === 'gif' ? 'GIF' : 'Photo'
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
    const primaryUrl = (opts.primaryMedia.value?.url ?? '').trim()
    if (primaryUrl) images.push(toAbs(primaryUrl))
    for (const u of opts.extraOgMediaUrls.value) images.push(toAbs(u))
    const linkImage = (opts.linkMeta.value?.imageUrl ?? '').trim()
    if (!images.length && linkImage) images.push(toAbs(linkImage))
    if (!images.length && avatarUrl) images.push(toAbs(avatarUrl))
    // Always include a site fallback at the end.
    images.push(toAbs('/images/banner.png'))

    return [
      authorUrl ? author : null,
      {
        '@type': 'Article',
        '@id': `${siteConfig.url}${canonicalPath.value}#article`,
        mainEntityOfPage: { '@id': `${siteConfig.url}${canonicalPath.value}#webpage` },
        headline: excerpt(opts.bodyTextSansLinks.value || 'Post', 90),
        description: seoDescription.value,
        datePublished: opts.post.value.createdAt,
        dateModified: opts.post.value.createdAt,
        author: { '@id': authorId },
        publisher: { '@id': `${siteConfig.url}/#organization` },
        image: Array.from(new Set(images)).filter(Boolean),
        isAccessibleForFree: true,
      }
    ].filter(Boolean)
  })

  usePageSeo({
    title: seoTitle,
    description: seoDescription,
    canonicalPath,
    ogType: computed(() => (opts.isRestricted.value ? 'website' : 'article')),
    image: seoImage,
    imageAlt: seoImageAlt,
    noindex: computed(() => opts.isRestricted.value || Boolean(opts.errorText.value)),
    author: seoAuthor,
    jsonLdGraph
  })

  // Extra share tags for article rich previews (public posts only).
  useHead({
    meta: computed(() => {
      if (!opts.post.value || opts.isRestricted.value) return []
      const username = (opts.post.value.author.username ?? '').trim()
      const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
      return [
        { property: 'article:published_time', content: opts.post.value.createdAt },
        { property: 'article:modified_time', content: opts.post.value.createdAt },
        ...(authorUrl ? [{ property: 'article:author', content: authorUrl }] : []),
        // Multiple images: add extra OG images so platforms can pick/rotate.
        ...opts.extraOgMediaUrls.value.map((u) => ({ property: 'og:image', content: toAbs(u) })),
      ]
    }),
  })
}

