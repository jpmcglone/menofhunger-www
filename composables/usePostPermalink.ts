import type { Ref } from 'vue'
import type { FeedPost, GetPostData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { siteConfig } from '~/config/site'
import { extractLinksFromText } from '~/utils/link-utils'
import type { LinkMetadata } from '~/utils/link-metadata'
import { normalizeForMeta } from '~/utils/text'

export async function usePostPermalink(postId: Ref<string>) {
  const { apiFetchData } = useApiClient()

  const { data, error } = await useAsyncData(
    () => `post:${postId.value}`,
    () => {
      if (!postId.value) throw new Error('Post not found.')
      return apiFetchData<GetPostData>(`/posts/${encodeURIComponent(postId.value)}`, { method: 'GET' })
    },
    { watch: [postId], server: true }
  )

  const post = computed(() => data.value ?? null)
  const isDeleted = computed(() => Boolean((data.value as FeedPost | null)?.deletedAt))

  const errorText = ref<string | null>(null)
  const accessHint = ref<'none' | 'verifiedOnly' | 'premiumOnly' | 'private'>('none')

  const isOnlyMe = computed(() => post.value?.visibility === 'onlyMe')

  function syncErrorToState() {
    const e = error.value
    if (!e) {
      errorText.value = null
      return
    }
    const err = e as { statusCode?: number; status?: number; response?: { status?: number } }
    const status = Number(err?.statusCode || err?.status || err?.response?.status || 0)
    const msg = (getApiErrorMessage(e) || 'Failed to load post.').toString()
    const lower = msg.toLowerCase()
    if (status === 403) {
      if (lower.includes('verified')) accessHint.value = 'verifiedOnly'
      else if (lower.includes('premium')) accessHint.value = 'premiumOnly'
      else if (lower.includes('private')) accessHint.value = 'private'
    }
    if (status === 403) errorText.value = msg
    else if (status === 404) errorText.value = 'Post not found.'
    else errorText.value = msg
    if (import.meta.server && (status >= 500 || status === 0)) {
      const event = useRequestEvent()
      if (event) setResponseStatus(event, 503)
    }
  }
  syncErrorToState()
  watch(error, syncErrorToState)

  const apiErrorStatus = computed(() => {
    const e = error.value as { statusCode?: number; status?: number; response?: { status?: number } } | null
    return Number(e?.statusCode ?? e?.status ?? e?.response?.status ?? 0)
  })

  return {
    post,
    data,
    error,
    errorText,
    accessHint,
    isDeleted,
    isOnlyMe,
    apiErrorStatus,
  }
}

export function usePostPermalinkMedia(options: {
  post: Ref<FeedPost | null>
  isRestricted: Ref<boolean>
  requestURL: { hostname?: string } | null
}) {
  const { post, isRestricted, requestURL } = options

  function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

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
      const requestHost = requestURL?.hostname ?? (import.meta.client ? window.location.hostname : '')
      if (requestHost) allowedHosts.add(requestHost.toLowerCase())
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
    const b = best
    if (!b) return null
    return {
      url: b.url ?? null,
      thumbnailUrl: b.kind === 'video' ? (b.thumbnailUrl ?? null) : null,
      kind: b.kind ?? null,
      width: b.width ?? null,
      height: b.height ?? null,
    }
  })

  const primaryVideo = computed(() => {
    const first = usableMedia.value.find((m) => m.kind === 'video')
    if (!first || !(first.url ?? '').trim()) return null
    return {
      url: (first.url ?? '').trim(),
      mp4Url: first.mp4Url ?? null,
      width: first.width ?? null,
      height: first.height ?? null,
    }
  })

  const extraOgMediaUrls = computed(() => {
    const xs = usableMedia.value
    const primaryUrl = (primaryMedia.value?.url ?? '').trim()
    const primaryThumb = (primaryMedia.value?.thumbnailUrl ?? '').trim()
    const out: string[] = []
    for (const m of xs) {
      const u = (m.url ?? '').trim()
      if (!u) continue
      if (primaryUrl && u === primaryUrl) continue
      if (primaryThumb && u === primaryThumb) continue
      out.push(u)
      if (out.length >= 4) break
    }
    return out
  })

  return {
    capturedLinks,
    previewLink,
    bodyTextSansLinks,
    usableMedia,
    primaryMedia,
    primaryVideo,
    extraOgMediaUrls,
  }
}
