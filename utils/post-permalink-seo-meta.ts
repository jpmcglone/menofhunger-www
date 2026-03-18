import type { FeedPost } from '~/types/api'
import type { LinkMetadata } from '~/utils/link-metadata'
import { siteConfig } from '~/config/site'
import { safeUrlHostname } from '~/utils/link-utils'
import { excerpt, gatedPostBodyPreview, normalizeForMeta } from '~/utils/text'

export const POST_PERMALINK_LOGO_OG = '/images/logo-black-bg.png'
const DESC_PUBLIC_MAX = 280
const TITLE_SNIP = 72

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

export type PostPermalinkSeoInput = {
  post: FeedPost | null
  postId: string
  errorText: string | null
  isRestricted: boolean
  restrictionLabel: string
  restrictionSeoDescription: string
  previewLink: string | null
  linkMeta: LinkMetadata | null
  primaryMedia: PostPermalinkPrimaryMedia | null | undefined
  extraOgMediaUrls: string[]
  primaryVideo: PostPermalinkPrimaryVideo | null | undefined
  bodyTextSansLinks: string
}

export type PostPermalinkSeoComputed = {
  title: string
  description: string
  author: string
  image: string
  imageAlt: string
  canonicalPath: string
  noindex: boolean
  ogType: 'article' | 'website'
  imageWidth?: number
  imageHeight?: number
  /** Absolute URLs for secondary og:image (public posts only). */
  ogImageSecondaryAbsoluteUrls: string[]
  ogVideoAbsoluteUrl: string | null
  jsonLdGraph: unknown[]
}

function tierShareSnippet(post: FeedPost): string {
  if (post.viewerCanAccess === false) return normalizeForMeta(post.body ?? '')
  return gatedPostBodyPreview(post.body ?? '')
}

function atAuthor(post: FeedPost | null): string {
  const u = (post?.author?.username ?? '').trim()
  return u ? `@${u}` : ''
}

function toAbs(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${siteConfig.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

function pollMetaPublicFromPost(p: FeedPost | null, isPublicPost: boolean) {
  if (!p || !isPublicPost) return null
  const poll = (p as any).poll as FeedPost['poll'] | null | undefined
  if (!poll) return null
  const totalVoteCount = Number((poll as any).totalVoteCount ?? 0) || 0
  const ended = Boolean((poll as any).ended)
  const endsAt = (poll as any).endsAt ? new Date((poll as any).endsAt) : null
  const endsAtText =
    endsAt && !Number.isNaN(endsAt.getTime())
      ? ended
        ? 'Done'
        : `Ends ${endsAt.toLocaleString('en-US')}`
      : null
  const firstOptionImage =
    ((poll as any).options as Array<{ imageUrl?: string | null }> | undefined)
      ?.map((o) => (o?.imageUrl ?? '').trim())
      .find(Boolean) ?? null
  return { totalVoteCount, ended, endsAtText, firstOptionImage }
}

/**
 * Pure SEO/share metadata for /p/:id. Used by usePostPermalinkSeo and unit tests.
 */
export function computePostPermalinkSeo(input: PostPermalinkSeoInput): PostPermalinkSeoComputed {
  const {
    post,
    postId,
    errorText,
    isRestricted,
    restrictionLabel,
    restrictionSeoDescription,
    previewLink,
    linkMeta,
    primaryMedia,
    extraOgMediaUrls,
    primaryVideo,
    bodyTextSansLinks,
  } = input

  const canonicalPath = `/p/${encodeURIComponent(postId)}`
  const visibility = post?.visibility
  const isPublicPost = visibility === 'public'
  const isTierGated = visibility === 'verifiedOnly' || visibility === 'premiumOnly'
  const isOnlyMePost = visibility === 'onlyMe'
  const pollMetaPublic = pollMetaPublicFromPost(post, isPublicPost)

  const gateLine = (() => {
    if (!post) return restrictionSeoDescription
    const v = post.visibility
    if (v === 'premiumOnly') return 'This post is for premium members.'
    if (v === 'verifiedOnly') return 'This post is for verified members.'
    return restrictionSeoDescription
  })()

  let title: string
  if (!post) {
    title = isRestricted ? restrictionLabel : 'Post'
  } else {
    const p = post
    const at = atAuthor(p)
    if (isOnlyMePost) {
      title = at ? `Private post — ${at}` : 'Private post'
    } else if (isTierGated) {
      const snip = tierShareSnippet(p)
      if (snip) title = at ? `${excerpt(snip, 58)} — ${at}` : excerpt(snip, 72)
      else title = at ? `Post by ${at}` : restrictionLabel
    } else {
      const bodyText = (bodyTextSansLinks ?? '').trim()
      const hasBody = Boolean(bodyText)
      if (pollMetaPublic) {
        if (hasBody) {
          const t = excerpt(bodyText, 58)
          title = at ? `Poll: ${t} — shared by ${at}` : `Poll: ${t}`
        } else title = at ? `Poll — shared by ${at}` : 'Poll'
      } else if (primaryMedia) {
        if (hasBody) {
          const t = excerpt(bodyText, TITLE_SNIP)
          title = at ? `${t} — shared by ${at}` : t
        } else {
          const kind = primaryMedia.kind === 'gif' ? 'GIF' : primaryMedia.kind === 'video' ? 'Video' : 'Photo'
          title = at ? `${kind} — shared by ${at}` : kind
        }
      } else {
        const external = (previewLink ?? '').trim()
        if (external) {
          const isLinkOnly = !hasBody
          if (isLinkOnly) {
            const lt = (linkMeta?.title ?? '').trim()
            const host = safeUrlHostname(external) ?? 'Link'
            const t = lt || host
            title = at ? `${t} — shared by ${at}` : t
          } else {
            const t = excerpt(bodyText, TITLE_SNIP)
            title = at ? `${t} — shared by ${at}` : t
          }
        } else if (hasBody) {
          const t = excerpt(bodyText, TITLE_SNIP)
          title = at ? `${t} — shared by ${at}` : t
        } else title = at ? `Post — shared by ${at}` : 'Post'
      }
    }
  }

  let description: string
  if (!post) {
    description = isRestricted ? restrictionSeoDescription : 'Post.'
  } else {
    const p = post
    const at = atAuthor(p)
    if (isOnlyMePost) {
      description = at ? `Private post by ${at} on ${siteConfig.name}.` : 'This post is private.'
    } else if (isTierGated) {
      const snip = tierShareSnippet(p)
      const gate = gateLine
      if (snip) description = excerpt(`${snip} ${gate}`, DESC_PUBLIC_MAX)
      else description = at ? `Post by ${at} on ${siteConfig.name}. ${gate}` : gate
    } else {
      const bodyText = (bodyTextSansLinks ?? '').trim()
      const hasBody = Boolean(bodyText)
      if (pollMetaPublic) {
        const votes = pollMetaPublic.totalVoteCount
        const votesLabel = `${votes} vote${votes === 1 ? '' : 's'}`
        const endsAtText = (pollMetaPublic.endsAtText ?? '').trim()
        const prefix = endsAtText ? `Poll · ${votesLabel} · ${endsAtText}` : `Poll · ${votesLabel}`
        const main = hasBody ? excerpt(bodyText, DESC_PUBLIC_MAX - 40) : at ? `Poll by ${at}.` : 'Poll.'
        description = excerpt(`${prefix} — ${main}`, DESC_PUBLIC_MAX) || 'Poll.'
      } else if (primaryMedia) {
        description = hasBody
          ? excerpt(bodyText, DESC_PUBLIC_MAX)
          : at
            ? `Post by ${at} on ${siteConfig.name}.`
            : `Post on ${siteConfig.name}.`
      } else {
        const external = (previewLink ?? '').trim()
        if (external) {
          const isLinkOnly = !hasBody
          if (isLinkOnly) {
            const d = (linkMeta?.description ?? '').trim()
            if (d) description = excerpt(d, DESC_PUBLIC_MAX)
            else {
              const site = (linkMeta?.siteName ?? '').trim()
              description = site ? `From ${site}.` : 'Shared link.'
            }
          } else {
            let d = excerpt(bodyText, DESC_PUBLIC_MAX)
            const linkDesc = (linkMeta?.description ?? '').trim()
            if (linkDesc && d.length < 160) {
              const remaining = Math.max(0, DESC_PUBLIC_MAX - d.length - 3)
              if (remaining >= 24) d = `${d} — ${excerpt(linkDesc, remaining)}`
            }
            description = d || 'Post.'
          }
        } else {
          description = hasBody
            ? excerpt(bodyText, DESC_PUBLIC_MAX)
            : at
              ? `Post by ${at} on ${siteConfig.name}.`
              : 'Post.'
        }
      }
    }
  }

  const author = atAuthor(post) || siteConfig.name

  let image: string
  if (!post) {
    image = POST_PERMALINK_LOGO_OG
  } else {
    const avatar = (post.author.avatarUrl ?? '').trim()
    if (isTierGated || isOnlyMePost) {
      image = avatar || POST_PERMALINK_LOGO_OG
    } else if (isPublicPost) {
      const posterUrl = (primaryMedia?.thumbnailUrl ?? '').trim()
      const mediaUrl = (primaryMedia?.url ?? '').trim()
      if (posterUrl) image = posterUrl
      else if (mediaUrl) image = mediaUrl
      else {
        const linkImage = (linkMeta?.imageUrl ?? '').trim()
        if (linkImage) image = linkImage
        else {
          const pollImage = (pollMetaPublic?.firstOptionImage ?? '').trim()
          image = pollImage || avatar || POST_PERMALINK_LOGO_OG
        }
      }
    } else image = avatar || POST_PERMALINK_LOGO_OG
  }

  let imageAlt: string
  if (!post) {
    imageAlt = siteConfig.name
  } else {
    const p = post
    const at = atAuthor(p)
    if (isTierGated || isOnlyMePost) {
      const av = (p.author.avatarUrl ?? '').trim()
      imageAlt = !av ? `${siteConfig.name} logo` : at ? `${at} on ${siteConfig.name}` : siteConfig.name
    } else {
      const bodyText = (bodyTextSansLinks ?? '').trim()
      const external = (previewLink ?? '').trim()
      if (pollMetaPublic) {
        imageAlt = bodyText ? `Poll: ${excerpt(bodyText, 120)}` : at ? `Poll shared by ${at}` : `Poll on ${siteConfig.name}`
      } else if (primaryMedia) {
        if (bodyText) imageAlt = excerpt(bodyText, 120)
        else {
          const kind = primaryMedia.kind === 'gif' ? 'GIF' : primaryMedia.kind === 'video' ? 'Video' : 'Photo'
          imageAlt = at ? `${kind} shared by ${at}` : `${kind} on ${siteConfig.name}`
        }
      } else if (external) {
        const t = (linkMeta?.title ?? '').trim()
        imageAlt = t ? `Shared link: ${t}` : at ? `Link shared by ${at}` : `Shared link on ${siteConfig.name}`
      } else imageAlt = at ? `Post shared by ${at}` : `Post on ${siteConfig.name}`
    }
  }

  const noindex = Boolean(
    errorText || post?.visibility === 'onlyMe' || (post?.visibility !== 'verifiedOnly' && post?.visibility !== 'premiumOnly' && isRestricted),
  )

  const useArticleOg = isPublicPost || isTierGated
  const ogType: 'article' | 'website' = useArticleOg ? 'article' : 'website'

  const imageWidth = isPublicPost ? primaryMedia?.width ?? undefined : undefined
  const imageHeight = isPublicPost ? primaryMedia?.height ?? undefined : undefined

  const ogImageSecondaryAbsoluteUrls = isPublicPost ? extraOgMediaUrls.map(toAbs) : []
  let ogVideoAbsoluteUrl: string | null = null
  if (isPublicPost && primaryVideo?.url) {
    const u = (primaryVideo.url ?? '').trim()
    if (u) ogVideoAbsoluteUrl = toAbs(u)
  }

  const jsonLdGraph: unknown[] = (() => {
    if (!post) return []
    const p = post
    const username = (p.author.username ?? '').trim()
    const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
    const avatarUrl = (p.author.avatarUrl ?? '').trim() || null
    const authorDisplay = username ? `@${username}` : siteConfig.name
    const authorNode: any = authorUrl
      ? { '@type': 'Person', name: authorDisplay, url: authorUrl, ...(avatarUrl ? { image: avatarUrl } : {}) }
      : { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url }

    if (isTierGated || isOnlyMePost) {
      const v = p.visibility
      const isAccessibleForFree = v !== 'verifiedOnly' && v !== 'premiumOnly' && v !== 'onlyMe'
      const headline = isTierGated
        ? excerpt(tierShareSnippet(p) || `Post by @${username || 'user'}`, 90)
        : `Private post — @${username || 'user'}`
      return [
        {
          '@type': 'Article',
          '@id': `${siteConfig.url}${canonicalPath}#article`,
          mainEntityOfPage: { '@id': `${siteConfig.url}${canonicalPath}#webpage` },
          headline,
          description,
          datePublished: p.createdAt,
          dateModified: p.createdAt,
          author: authorNode,
          publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
          isAccessibleForFree,
        },
      ]
    }

    const authorId = authorUrl ? `${authorUrl}#person` : `${siteConfig.url}/#organization`
    const authorPerson: any = authorUrl
      ? {
          '@type': 'Person',
          '@id': authorId,
          name: authorDisplay,
          url: authorUrl,
          ...(avatarUrl ? { image: avatarUrl } : {}),
        }
      : { '@type': 'Organization', '@id': `${siteConfig.url}/#organization`, name: siteConfig.name, url: siteConfig.url }

    const images: string[] = []
    const primaryImgUrl = (primaryMedia?.thumbnailUrl ?? primaryMedia?.url ?? '').trim()
    if (primaryImgUrl) images.push(toAbs(primaryImgUrl))
    const primaryMediaUrl = (primaryMedia?.url ?? '').trim()
    if (primaryMediaUrl && primaryMediaUrl !== primaryImgUrl) images.push(toAbs(primaryMediaUrl))
    for (const u of extraOgMediaUrls) images.push(toAbs(u))
    const linkImage = (linkMeta?.imageUrl ?? '').trim()
    if (!images.length && linkImage) images.push(toAbs(linkImage))
    const pollImage = (pollMetaPublic?.firstOptionImage ?? '').trim()
    if (!images.length && pollImage) images.push(toAbs(pollImage))
    if (!images.length && avatarUrl) images.push(toAbs(avatarUrl))
    images.push(toAbs(POST_PERMALINK_LOGO_OG))

    const headlineBase = excerpt(bodyTextSansLinks || 'Post', 90)
    const headline = pollMetaPublic ? `Poll: ${headlineBase}` : headlineBase
    const article: any = {
      '@type': 'Article',
      '@id': `${siteConfig.url}${canonicalPath}#article`,
      mainEntityOfPage: { '@id': `${siteConfig.url}${canonicalPath}#webpage` },
      headline,
      description,
      datePublished: p.createdAt,
      dateModified: p.createdAt,
      author: { '@id': authorId },
      publisher: { '@id': `${siteConfig.url}/#organization` },
      image: Array.from(new Set(images)).filter(Boolean),
      isAccessibleForFree: true,
    }
    if (pollMetaPublic) {
      article.about = [{ '@type': 'Thing', name: 'Poll' }]
      article.interactionStatistic = [
        {
          '@type': 'InteractionCounter',
          interactionType: 'http://schema.org/VoteAction',
          userInteractionCount: pollMetaPublic.totalVoteCount,
        },
      ]
    }
    if (ogVideoAbsoluteUrl) {
      const video = primaryVideo!
      article.video = {
        '@type': 'VideoObject',
        contentUrl: video.mp4Url ? toAbs(video.mp4Url) : ogVideoAbsoluteUrl,
        url: ogVideoAbsoluteUrl,
        ...(video.width != null && video.height != null ? { width: video.width, height: video.height } : {}),
      }
    }
    return [authorUrl ? authorPerson : null, article].filter(Boolean)
  })()

  return {
    title,
    description,
    author,
    image,
    imageAlt,
    canonicalPath,
    noindex,
    ogType,
    imageWidth,
    imageHeight,
    ogImageSecondaryAbsoluteUrls,
    ogVideoAbsoluteUrl,
    jsonLdGraph,
  }
}
