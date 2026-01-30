<template>
  <div class="-mx-4">
    <div v-if="errorText" class="mx-4 mt-4">
      <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div class="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {{ errorTitle }}
        </div>
        <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
          {{ errorBody }}
        </div>

        <div v-if="showLoginCta" class="mt-4 flex flex-wrap items-center gap-2">
          <Button
            label="Log in"
            icon="pi pi-sign-in"
            rounded
            @click="goToLogin"
          />
          <div class="text-xs text-gray-500 dark:text-gray-400">
            You’ll be returned here after logging in.
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="post" class="-mx-0">
      <AppPostRow :post="post" :clickable="false" @deleted="onDeleted" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost, GetPostResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { siteConfig } from '~/config/site'
import { extractLinksFromText, safeUrlHostname } from '~/utils/link-utils'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'

definePageMeta({
  layout: 'app',
  title: 'Post'
})

const route = useRoute()
const postId = computed(() => String(route.params.id || '').trim())
const { apiFetchData } = useApiClient()

const { user, ensureLoaded } = useAuth()
// Ensure SSR/initial loads know whether viewer is logged in.
await ensureLoaded()

const isAuthed = computed(() => Boolean(user.value?.id))
const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const viewerIsPremium = computed(() => Boolean(user.value?.premium))

const post = ref<FeedPost | null>(null)
const errorText = ref<string | null>(null)
const accessHint = ref<'none' | 'verifiedOnly' | 'premiumOnly' | 'private'>('none')
function onDeleted() {
  // Post is gone for this viewer; return to feed.
  post.value = null
  errorText.value = 'Post deleted.'
  void navigateTo('/home')
}

const { data, error } = await useAsyncData(`post:${postId.value}`, async () => {
  if (!postId.value) throw new Error('Post not found.')
  return await apiFetchData<GetPostResponse>(`/posts/${encodeURIComponent(postId.value)}`, { method: 'GET' })
})

post.value = data.value?.post ?? null
if (error.value) {
  // Nuxt error shapes vary across SSR/client; normalize to something useful.
  const e: any = error.value
  const status = Number(e?.statusCode || e?.status || e?.response?.status || 0)
  const msg = (getApiErrorMessage(e) || 'Failed to load post.').toString()

  // Heuristic: infer restricted type from message so we can render + set redacted SEO
  // even when the API refuses to return the post body/author.
  const lower = msg.toLowerCase()
  if (status === 403) {
    if (lower.includes('verified')) accessHint.value = 'verifiedOnly'
    else if (lower.includes('premium')) accessHint.value = 'premiumOnly'
    else if (lower.includes('private')) accessHint.value = 'private'
  }

  if (status === 403) {
    errorText.value = msg
  } else if (status === 404) {
    errorText.value = 'Post not found.'
  } else {
    errorText.value = msg
  }
} else {
  errorText.value = null
}

function normalizeForMeta(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function excerpt(text: string, maxLen: number) {
  const t = normalizeForMeta(text)
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const canonicalPath = computed(() => `/p/${encodeURIComponent(postId.value)}`)

const isRestricted = computed(() => {
  const v = post.value?.visibility
  if (v === 'verifiedOnly' || v === 'premiumOnly' || v === 'onlyMe') return true
  return accessHint.value !== 'none'
})

function isLocalHost(host: string, expected: string) {
  const h = (host ?? '').trim().toLowerCase()
  const e = (expected ?? '').trim().toLowerCase()
  if (!h || !e) return false
  return h === e || h === `www.${e}`
}

function tryExtractLocalPostId(url: string): string | null {
  const raw = (url ?? '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null

    const allowedHosts = new Set<string>()
    try {
      const fromCfg = new URL(siteConfig.url)
      if (fromCfg.hostname) allowedHosts.add(fromCfg.hostname.toLowerCase())
    } catch {
      // ignore
    }
    if (import.meta.client) {
      const h = window.location.hostname
      if (h) allowedHosts.add(h.toLowerCase())
    }

    const host = u.hostname.toLowerCase()
    const ok = Array.from(allowedHosts).some((a) => isLocalHost(host, a))
    if (!ok) return null

    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    if (parts[0] !== 'p') return null
    const id = (parts[1] ?? '').trim()
    return id || null
  } catch {
    return null
  }
}

const capturedLinks = computed(() => {
  if (!post.value || isRestricted.value) return []
  return extractLinksFromText(post.value.body)
})

const previewLink = computed(() => {
  if (!post.value || isRestricted.value) return null
  if (post.value.media?.length) return null
  const xs = capturedLinks.value
  for (let i = xs.length - 1; i >= 0; i--) {
    const u = xs[i]
    if (!u) continue
    if (tryExtractLocalPostId(u)) continue
    return u
  }
  return null
})

const bodyTextSansLinks = computed(() => {
  if (!post.value || isRestricted.value) return ''
  let body = (post.value.body ?? '').toString()
  for (const u of capturedLinks.value) {
    const url = (u ?? '').trim()
    if (!url) continue
    const re = new RegExp(escapeRegExp(url), 'g')
    body = body.replace(re, ' ')
  }
  return normalizeForMeta(body)
})

const usableMedia = computed(() => {
  if (!post.value || isRestricted.value) return []
  return (post.value.media ?? []).filter((m) => Boolean(m && !m.deletedAt && (m.url ?? '').trim()))
})

const primaryMedia = computed(() => {
  const xs = usableMedia.value
  if (!xs.length) return null
  let best = xs[0]
  let bestScore = -1
  for (const m of xs) {
    const w = typeof m.width === 'number' ? m.width : null
    const h = typeof m.height === 'number' ? m.height : null
    const score = w && h && w > 0 && h > 0 ? w * h : 0
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
})

const extraOgMediaUrls = computed(() => {
  const xs = usableMedia.value
  const primaryUrl = (primaryMedia.value?.url ?? '').trim()
  const out: string[] = []
  for (const m of xs) {
    const u = (m.url ?? '').trim()
    if (!u) continue
    if (primaryUrl && u === primaryUrl) continue
    out.push(u)
    if (out.length >= 3) break
  }
  return out
})

function isAbortError(e: unknown): boolean {
  const name = (e as any)?.name
  return name === 'AbortError' || name === 'TimeoutError'
}

async function getLinkMetadataWithTimeout(url: string, timeoutMs: number): Promise<LinkMetadata | null> {
  if (!url) return null
  const ms = Number(timeoutMs)
  if (!ms || ms <= 0) return await getLinkMetadata(url)

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), ms)
  try {
    return await getLinkMetadata(url, { signal: controller.signal })
  } catch (e: unknown) {
    if (isAbortError(e)) return null
    return null
  } finally {
    clearTimeout(t)
  }
}

const linkMetaKey = computed(() => {
  const u = (previewLink.value ?? '').trim()
  return `post:${postId.value}:linkmeta:${u || 'none'}`
})

const { data: linkMetaData } = await useAsyncData(
  linkMetaKey,
  async () => {
    if (!post.value || isRestricted.value) return null
    if (usableMedia.value.length) return null
    const url = (previewLink.value ?? '').trim()
    if (!url) return null
    // Best-effort SSR unfurl for share previews (avoid long stalls).
    return await getLinkMetadataWithTimeout(url, 2000)
  },
  {
    server: true,
    watch: [previewLink],
  },
)

const linkMeta = computed<LinkMetadata | null>(() => (linkMetaData.value as LinkMetadata | null) ?? null)

const restrictionLabel = computed(() => {
  const v = post.value?.visibility
  if (v === 'verifiedOnly') return 'Verified-only post'
  if (v === 'premiumOnly') return 'Premium-only post'
  if (v === 'onlyMe') return 'Private post'
  if (accessHint.value === 'verifiedOnly') return 'Verified-only post'
  if (accessHint.value === 'premiumOnly') return 'Premium-only post'
  if (accessHint.value === 'private') return 'Private post'
  return 'Post'
})

const restrictionSeoDescription = computed(() => {
  const v = post.value?.visibility
  const hint = accessHint.value

  if (v === 'verifiedOnly' || hint === 'verifiedOnly') {
    return 'This post is only available to verified members.'
  }
  if (v === 'premiumOnly' || hint === 'premiumOnly') {
    return 'This post is only available to premium members.'
  }
  // Only-me: never reveal author or content.
  if (v === 'onlyMe' || hint === 'private') {
    return 'This post is private and only available to its author.'
  }
  return 'Post.'
})

const seoTitle = computed(() => {
  if (!post.value) return isRestricted.value ? restrictionLabel.value : 'Post'
  if (isRestricted.value) return restrictionLabel.value

  const username = (post.value.author.username ?? '').trim()
  const bodyText = (bodyTextSansLinks.value ?? '').trim()
  const hasBodyText = Boolean(bodyText)

  // Media post: preview the media.
  if (primaryMedia.value) {
    if (hasBodyText) {
      const t = excerpt(bodyText, 56)
      return username ? `${t} — @${username}` : t
    }
    const kind = primaryMedia.value.kind === 'gif' ? 'GIF' : 'Photo'
    return username ? `${kind} by @${username}` : kind
  }

  // External link share: preview the link.
  const external = (previewLink.value ?? '').trim()
  if (external) {
    const isLinkOnly = !hasBodyText
    if (isLinkOnly) {
      const linkTitle = (linkMeta.value?.title ?? '').trim()
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
  if (!post.value) {
    if (!isRestricted.value) return 'Post.'
    return restrictionSeoDescription.value
  }
  if (isRestricted.value) {
    return restrictionSeoDescription.value
  }

  const username = (post.value.author.username ?? '').trim()
  const bodyText = (bodyTextSansLinks.value ?? '').trim()
  const hasBodyText = Boolean(bodyText)

  if (primaryMedia.value) {
    if (hasBodyText) return excerpt(bodyText, 190)
    return username ? `Post by @${username}.` : 'Post.'
  }

  const external = (previewLink.value ?? '').trim()
  if (external) {
    const isLinkOnly = !hasBodyText
    if (isLinkOnly) {
      const d = (linkMeta.value?.description ?? '').trim()
      if (d) return excerpt(d, 190)
      const site = (linkMeta.value?.siteName ?? '').trim()
      return site ? `From ${site}.` : 'Shared link.'
    }

    let d = excerpt(bodyText, 190)
    const linkDesc = (linkMeta.value?.description ?? '').trim()
    if (linkDesc && d.length < 130) {
      const remaining = Math.max(0, 190 - d.length - 3)
      if (remaining >= 24) d = `${d} — ${excerpt(linkDesc, remaining)}`
    }
    return d || 'Post.'
  }

  return hasBodyText ? excerpt(bodyText, 190) : 'Post.'
})

const seoAuthor = computed(() => {
  if (!post.value || isRestricted.value) return siteConfig.name
  const username = (post.value.author.username ?? '').trim()
  return username ? `@${username}` : siteConfig.name
})

const seoImage = computed(() => {
  if (isRestricted.value) return '/images/logo-black-bg.png'

  // Content-first: media wins.
  const mediaUrl = (primaryMedia.value?.url ?? '').trim()
  if (mediaUrl) return mediaUrl

  // External link unfurl image.
  const linkImage = (linkMeta.value?.imageUrl ?? '').trim()
  if (linkImage) return linkImage

  // Identity-first baseline for text-only (and as fallback for link shares with no image).
  const avatar = (post.value?.author.avatarUrl ?? '').trim()
  return avatar || '/images/banner.png'
})

const seoImageAlt = computed(() => {
  if (isRestricted.value) return `${siteConfig.name} logo`
  const username = (post.value?.author.username ?? '').trim()
  const bodyText = (bodyTextSansLinks.value ?? '').trim()
  const external = (previewLink.value ?? '').trim()

  if (primaryMedia.value) {
    if (bodyText) return excerpt(bodyText, 120)
    const kind = primaryMedia.value.kind === 'gif' ? 'GIF' : 'Photo'
    return username ? `${kind} by @${username}` : `${kind} on ${siteConfig.name}`
  }
  if (external) {
    const t = (linkMeta.value?.title ?? '').trim()
    return t ? `Shared link: ${t}` : username ? `Shared link by @${username}` : `Shared link on ${siteConfig.name}`
  }
  return username ? `Post by @${username}` : `Post on ${siteConfig.name}`
})

function toAbs(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${siteConfig.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

const jsonLdGraph = computed(() => {
  if (!post.value || isRestricted.value) return []

  const username = (post.value.author.username ?? '').trim()
  const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
  const authorId = authorUrl ? `${authorUrl}#person` : `${siteConfig.url}/#organization`
  const avatarUrl = (post.value.author.avatarUrl ?? '').trim() || null
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
  const primaryUrl = (primaryMedia.value?.url ?? '').trim()
  if (primaryUrl) images.push(toAbs(primaryUrl))
  for (const u of extraOgMediaUrls.value) images.push(toAbs(u))
  const linkImage = (linkMeta.value?.imageUrl ?? '').trim()
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
      headline: excerpt(bodyTextSansLinks.value || 'Post', 90),
      description: seoDescription.value,
      datePublished: post.value.createdAt,
      dateModified: post.value.createdAt,
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
  ogType: computed(() => (isRestricted.value ? 'website' : 'article')),
  image: seoImage,
  imageAlt: seoImageAlt,
  noindex: computed(() => isRestricted.value || Boolean(errorText.value)),
  author: seoAuthor,
  jsonLdGraph
})

// Extra share tags for article rich previews (public posts only).
useHead({
  meta: computed(() => {
    if (!post.value || isRestricted.value) return []
    const username = (post.value.author.username ?? '').trim()
    const authorUrl = username ? `${siteConfig.url}/u/${encodeURIComponent(username)}` : null
    return [
      { property: 'article:published_time', content: post.value.createdAt },
      { property: 'article:modified_time', content: post.value.createdAt },
      ...(authorUrl ? [{ property: 'article:author', content: authorUrl }] : []),
      // Multiple images: add extra OG images so platforms can pick/rotate.
      ...extraOgMediaUrls.value.map((u) => ({ property: 'og:image', content: toAbs(u) })),
    ]
  }),
})

const showLoginCta = computed(() => {
  if (isAuthed.value) return false
  // Only show login CTA when access is the problem (not generic 404).
  return accessHint.value !== 'none'
})

const errorTitle = computed(() => {
  if (!errorText.value) return ''
  if (accessHint.value !== 'none') return restrictionLabel.value
  return 'Post unavailable'
})

const errorBody = computed(() => {
  if (!errorText.value) return ''

  // Access-controlled posts
  if (accessHint.value !== 'none') {
    const parts: string[] = []
    if (!isAuthed.value) parts.push('You’re not logged in.')

    if (accessHint.value === 'verifiedOnly') {
      parts.push(
        isAuthed.value && !viewerIsVerified.value
          ? 'Your account is not verified yet.'
          : 'This post is visible to verified members only.',
      )
    } else if (accessHint.value === 'premiumOnly') {
      parts.push(
        isAuthed.value && !viewerIsPremium.value
          ? 'Your account does not have premium access.'
          : 'This post is visible to premium members only.',
      )
    } else if (accessHint.value === 'private') {
      parts.push('This post is private. If it’s yours, log in to view it.')
    } else {
      parts.push(errorText.value)
    }

    return parts.join(' ')
  }

  return errorText.value
})

function goToLogin() {
  const redirect = encodeURIComponent(route.fullPath)
  return navigateTo(`/login?redirect=${redirect}`)
}
</script>

