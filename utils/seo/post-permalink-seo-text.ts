import { formatLocaleDateTime } from '~/utils/time-format'
import type { CommunityGroupPreview, FeedPost } from '~/types/api'
import type { LinkMetadata } from '~/utils/link-metadata'
import { siteConfig } from '~/config/site'
import { excerpt, gatedPostBodyPreview, normalizeForMeta } from '~/utils/text'

/** Types and text helpers behind computePostPermalinkSeo (re-exported from post-permalink-seo-meta). */
export const POST_PERMALINK_LOGO_OG = '/images/logo-black-bg-small.png'
export const DESC_PUBLIC_MAX = 280
export const TITLE_SNIP = 72
// When the post belongs to a community group we suffix the title with `· {group}`.
// Reserve a few characters for the suffix so we don't blow past Twitter/OG title
// limits when both author + group are appended.
export const GROUP_TITLE_SUFFIX_BUDGET = 28

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
  /**
   * Twitter (and Discord) card type.
   * `summary_large_image` — real landscape/unknown-ratio post media or link preview images.
   * `summary`             — square/portrait fallbacks (avatars, group avatars, logo, portrait media).
   *                         Prevents Discord from stretching a square avatar into a wide banner.
   */
  twitterCard: 'summary' | 'summary_large_image'
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

export function tierShareSnippet(post: FeedPost): string {
  if (post.viewerCanAccess === false) return normalizeForMeta(post.body ?? '')
  return gatedPostBodyPreview(post.body ?? '')
}

export function atAuthor(post: FeedPost | null): string {
  const u = (post?.author?.username ?? '').trim()
  return u ? `@${u}` : ''
}

/** Social-card title when there is no public body to lead with. */
export function identityTitle(at: string, kind?: string): string {
  if (kind && at) return `${kind} · ${at}`
  if (kind) return kind
  return at || 'Post'
}

export function attributionLine(at: string): string {
  return at ? `Post by ${at} on ${siteConfig.name}.` : `Post on ${siteConfig.name}.`
}

/** Text that did not fit in the title excerpt, if any. */
export function bodyAfterTitleExcerpt(body: string, titleBudget: number): string {
  const t = normalizeForMeta(body)
  if (!t) return ''
  const titleExcerpt = excerpt(t, titleBudget)
  const lead = titleExcerpt.replace(/…$/, '')
  if (t.startsWith(lead)) return t.slice(lead.length).trim()
  if (t.length <= titleBudget) return ''
  return t.slice(Math.max(0, titleBudget - 1)).trim()
}

/**
 * X/OG cards show title and description together. Repeating the post body in both
 * looks like a duplicate unfurl. Short posts: title is the body, description is
 * attribution. Long posts: title is the lead; description continues the rest.
 * `extraUnique` (link-preview copy) is used only when the body is fully in the title.
 */
export function publicShareDescription(body: string, titleBudget: number, at: string, extraUnique = ''): string {
  const rest = bodyAfterTitleExcerpt(body, titleBudget)
  if (rest) return excerpt(rest, DESC_PUBLIC_MAX)
  const extra = normalizeForMeta(extraUnique)
  if (extra) return excerpt(extra, DESC_PUBLIC_MAX)
  return attributionLine(at)
}

export function toAbs(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${siteConfig.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

export function pollMetaPublicFromPost(p: FeedPost | null, isPublicPost: boolean) {
  if (!p || !isPublicPost) return null
  const poll = p.poll
  if (!poll) return null
  const totalVoteCount = Number(poll.totalVoteCount ?? 0) || 0
  const ended = Boolean(poll.ended)
  const endsAt = poll.endsAt ? new Date(poll.endsAt) : null
  const endsAtText =
    endsAt && !Number.isNaN(endsAt.getTime())
      ? ended
        ? 'Done'
        : `Ends ${formatLocaleDateTime(endsAt)}`
      : null
  const firstOptionImage =
    poll.options
      ?.map((o) => (o?.imageUrl ?? '').trim())
      .find(Boolean) ?? null
  return { totalVoteCount, ended, endsAtText, firstOptionImage }
}

