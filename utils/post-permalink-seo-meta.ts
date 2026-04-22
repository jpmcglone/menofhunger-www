import type { CommunityGroupPreview, FeedPost } from '~/types/api'
import type { LinkMetadata } from '~/utils/link-metadata'
import { siteConfig } from '~/config/site'
import { safeUrlHostname } from '~/utils/link-utils'
import { excerpt, gatedPostBodyPreview, normalizeForMeta } from '~/utils/text'

export const POST_PERMALINK_LOGO_OG = '/images/logo-black-bg.png'
const DESC_PUBLIC_MAX = 280
const TITLE_SNIP = 72
// When the post belongs to a community group we suffix the title with `· {group}`.
// Reserve a few characters for the suffix so we don't blow past Twitter/OG title
// limits when both author + group are appended.
const GROUP_TITLE_SUFFIX_BUDGET = 28

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
  /**
   * The community group the post belongs to (if any). Used to:
   *   - mention the group in the share title / description
   *   - slot the group avatar into the og:image fallback chain
   *   - reference the group from JSON-LD as `articleSection` / `isPartOf`
   * Groups are public entities, so we can include them even on tier-gated posts.
   * For `onlyMe` posts we still skip group hints to keep the share private.
   */
  groupPreview?: CommunityGroupPreview | null
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
  /**
   * Resolved compact info about the group the post belongs to, if any. Surfaced
   * so the composable / page can emit `og:article:section` and other meta tags
   * without re-parsing `groupPreview`. Null when the post has no group, or the
   * post is `onlyMe` (we don't leak group affiliation on private permalinks).
   */
  group: {
    name: string
    slug: string
    url: string
    avatarAbsoluteUrl: string | null
    descriptionPreview: string
  } | null
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
    groupPreview,
  } = input

  const canonicalPath = `/p/${encodeURIComponent(postId)}`
  const visibility = post?.visibility
  const isPublicPost = visibility === 'public'
  const isTierGated = visibility === 'verifiedOnly' || visibility === 'premiumOnly'
  const isOnlyMePost = visibility === 'onlyMe'
  const pollMetaPublic = pollMetaPublicFromPost(post, isPublicPost)

  // Resolve a usable group reference. We only surface group info on non-private
  // posts — onlyMe shares should not leak which group an author belongs to.
  const groupRef = (() => {
    if (!post || isOnlyMePost) return null
    const g = groupPreview ?? post.groupPreview ?? null
    if (!g || !g.id || !g.slug || !g.name) return null
    const name = (g.name ?? '').trim()
    const slug = (g.slug ?? '').trim()
    if (!name || !slug) return null
    const avatar = (g.avatarImageUrl ?? '').trim() || null
    return {
      name,
      slug,
      url: `${siteConfig.url}/g/${encodeURIComponent(slug)}`,
      avatarAbsoluteUrl: avatar ? toAbs(avatar) : null,
      descriptionPreview: (g.descriptionPreview ?? '').trim(),
    }
  })()
  const groupSuffix = groupRef ? ` · in ${excerpt(groupRef.name, GROUP_TITLE_SUFFIX_BUDGET)}` : ''

  const gateLine = (() => {
    if (!post) return restrictionSeoDescription
    const v = post.visibility
    if (v === 'premiumOnly') return 'This post is for premium members.'
    if (v === 'verifiedOnly') return 'This post is for verified members.'
    return restrictionSeoDescription
  })()

  // Compose the final title from a "core" piece (existing logic) + an optional
  // " · in <Group>" suffix. We trim the core so the suffix has room without
  // blowing past TITLE_SNIP, but only when a group is actually present.
  const titleCoreBudget = groupRef ? Math.max(24, TITLE_SNIP - groupSuffix.length) : TITLE_SNIP
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
          const t = excerpt(bodyText, titleCoreBudget)
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
            const t = excerpt(bodyText, titleCoreBudget)
            title = at ? `${t} — shared by ${at}` : t
          }
        } else if (hasBody) {
          const t = excerpt(bodyText, titleCoreBudget)
          title = at ? `${t} — shared by ${at}` : t
        } else title = at ? `Post — shared by ${at}` : 'Post'
      }
    }
  }
  // Append the group affiliation. We do this for every visibility except
  // onlyMe (groupRef is already null for onlyMe), so tier-gated shares still
  // surface "in <Group>" — the group itself is public info.
  if (groupRef && title && !title.includes(groupRef.name)) {
    title = `${title}${groupSuffix}`
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

  // Surface the group in the description too. Suffix-style so we don't disrupt
  // the existing "first sentence is the body excerpt" structure that crawlers
  // rely on. We always include the group line even when title already contains
  // it, since description is what most search snippets show.
  if (groupRef && description) {
    const groupLine = `From the ${groupRef.name} group on ${siteConfig.name}.`
    const combined = `${description.replace(/\s+$/, '')} ${groupLine}`.trim()
    description = excerpt(combined, DESC_PUBLIC_MAX) || description
  }

  const author = atAuthor(post) || siteConfig.name

  let image: string
  if (!post) {
    image = POST_PERMALINK_LOGO_OG
  } else {
    const avatar = (post.author.avatarUrl ?? '').trim()
    // Group avatar slots in **between** the post-specific image and the user
    // avatar fallback. Rationale: when a post belongs to a community group, the
    // group identity is more recognizable in a share preview than the author
    // avatar (which tends to be a generic face). Public posts still let real
    // post media (photo / video poster / link image / poll image) win.
    const groupAvatar = groupRef?.avatarAbsoluteUrl ?? null
    if (isTierGated || isOnlyMePost) {
      image = groupAvatar || avatar || POST_PERMALINK_LOGO_OG
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
          image = pollImage || groupAvatar || avatar || POST_PERMALINK_LOGO_OG
        }
      }
    } else image = groupAvatar || avatar || POST_PERMALINK_LOGO_OG
  }

  let imageAlt: string
  const imageIsGroupAvatar = Boolean(
    groupRef?.avatarAbsoluteUrl && image === groupRef.avatarAbsoluteUrl,
  )
  if (!post) {
    imageAlt = siteConfig.name
  } else if (imageIsGroupAvatar && groupRef) {
    const at = atAuthor(post)
    imageAlt = at
      ? `${groupRef.name} group avatar — post by ${at}`
      : `${groupRef.name} group avatar`
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

    // Group node — referenced by both gated and public articles via `isPartOf`
    // and `articleSection`. We still emit it for tier-gated posts because the
    // group itself is public; only `onlyMe` skips it (groupRef is null there).
    const groupNode: any = groupRef
      ? {
          '@type': 'Organization',
          '@id': `${groupRef.url}#group`,
          name: groupRef.name,
          url: groupRef.url,
          ...(groupRef.avatarAbsoluteUrl ? { logo: groupRef.avatarAbsoluteUrl, image: groupRef.avatarAbsoluteUrl } : {}),
          ...(groupRef.descriptionPreview ? { description: groupRef.descriptionPreview } : {}),
        }
      : null

    if (isTierGated || isOnlyMePost) {
      const v = p.visibility
      const isAccessibleForFree = v !== 'verifiedOnly' && v !== 'premiumOnly' && v !== 'onlyMe'
      const headline = isTierGated
        ? excerpt(tierShareSnippet(p) || `Post by @${username || 'user'}`, 90)
        : `Private post — @${username || 'user'}`
      const article: any = {
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
      }
      if (groupNode) {
        article.articleSection = groupRef!.name
        article.isPartOf = { '@id': groupNode['@id'] }
      }
      return groupNode ? [groupNode, article] : [article]
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
    // Group avatar slots in before user avatar — same priority as the og:image
    // resolver above so the JSON-LD `image` array reflects the same hierarchy.
    if (!images.length && groupRef?.avatarAbsoluteUrl) images.push(groupRef.avatarAbsoluteUrl)
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
    if (groupNode) {
      article.articleSection = groupRef!.name
      article.isPartOf = { '@id': groupNode['@id'] }
    }
    return [authorUrl ? authorPerson : null, groupNode, article].filter(Boolean)
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
    group: groupRef,
  }
}
