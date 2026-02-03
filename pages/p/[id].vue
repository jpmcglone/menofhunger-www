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
        <div v-else-if="showServerErrorCta" class="mt-4 flex flex-wrap items-center gap-3">
          <NuxtLink to="/status" class="text-sm font-medium moh-text underline underline-offset-2">
            Check status
          </NuxtLink>
          <button
            type="button"
            class="text-sm font-medium moh-text-muted hover:opacity-90 underline underline-offset-2"
            @click="() => window.location.reload()"
          >
            Try again
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="post" class="-mx-0">
      <div ref="highlightedPostRef" class="scroll-mt-0">
        <AppFeedPostRow
          v-if="post.parent"
          :post="post"
          :highlighted-post-id="post.id"
          :clickable="false"
          activate-video-on-mount
          @deleted="onDeleted"
        />
        <AppPostRow
          v-else
          :post="post"
          :highlight="true"
          :clickable="false"
          @deleted="onDeleted"
        />
      </div>

      <template v-if="!isOnlyMe">
        <div v-if="showReplyComposer" class="border-b border-gray-200 dark:border-zinc-800">
          <AppPostComposer
            v-if="replyContext"
            :reply-to="replyContext"
            :create-post="createComment"
            auto-focus
            :show-divider="false"
            @posted="onReplyPosted"
          >
            <template #above-textarea>
              <span v-if="replyingToDisplay.length">
                Replying to
                <template v-for="(p, i) in replyingToDisplay" :key="p.id">
                  <NuxtLink
                    :to="`/u/${encodeURIComponent(p.username)}`"
                    class="font-semibold hover:underline underline-offset-2 moh-text"
                    :class="participantLinkClass(p)"
                    :aria-label="`View @${p.username} profile`"
                  >
                    @{{ p.username }}
                  </NuxtLink>
                  <span v-if="i < replyingToDisplay.length - 1" class="moh-text-muted">, </span>
                </template>
              </span>
            </template>
          </AppPostComposer>
        </div>

        <div class="border-b border-gray-200 dark:border-zinc-800">
          <div class="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-zinc-800">
            <div class="text-sm font-semibold moh-text">
              Comments
              <span class="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {{ commentCountDisplay }}
              </span>
            </div>
            <AppFeedFiltersBar
              :sort="commentsSort"
              :filter="'all'"
              :viewer-is-verified="viewerIsVerified"
              :viewer-is-premium="viewerIsPremium"
              :show-reset="commentsSort !== 'new'"
              :show-visibility-filter="false"
              @update:sort="onCommentsSortChange"
              @reset="onCommentsFilterReset"
            />
          </div>
          <div v-if="commentsLoading && !comments.length" class="px-4 py-6 text-sm moh-text-muted">
            Loading…
          </div>
          <div v-else-if="!comments.length" class="px-4 py-6 text-sm moh-text-muted">
            No comments yet.
          </div>
          <template v-else>
          <div v-for="c in comments" :key="c.id">
            <AppPostRow :post="c" @deleted="onCommentDeleted" />
          </div>
          <div v-if="commentsNextCursor" class="flex justify-center px-4 py-4">
            <Button
              label="Load more comments"
              severity="secondary"
              rounded
              :loading="commentsLoading"
              :disabled="commentsLoading"
              @click="loadMoreComments"
            />
          </div>
          </template>
        </div>
      </template>

      <div class="min-h-[80dvh] shrink-0" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ApiEnvelope,
  ApiPagination,
  FeedPost,
  GetPostCommentsData,
  GetPostData,
  GetThreadParticipantsData,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { siteConfig } from '~/config/site'
import { extractLinksFromText } from '~/utils/link-utils'
import type { LinkMetadata } from '~/utils/link-metadata'
import { excerpt, normalizeForMeta } from '~/utils/text'
import { usePostPermalinkSeo } from '~/composables/usePostPermalinkSeo'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { useReplyModal } from '~/composables/useReplyModal'
import { useMiddleScroller } from '~/composables/useMiddleScroller'

definePageMeta({
  layout: 'app',
  title: 'Post',
})

const route = useRoute()
const requestURL = useRequestURL()
const postId = computed(() => String(route.params.id || '').trim())
const { apiFetch, apiFetchData } = useApiClient()
const highlightedPostRef = ref<HTMLElement | null>(null)

const { user, ensureLoaded } = useAuth()
// Ensure SSR/initial loads know whether viewer is logged in.
await ensureLoaded()

const isAuthed = computed(() => Boolean(user.value?.id))
const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const viewerIsPremium = computed(() => Boolean(user.value?.premium))

const errorText = ref<string | null>(null)
const accessHint = ref<'none' | 'verifiedOnly' | 'premiumOnly' | 'private'>('none')
const isDeleted = ref(false)

const { data, error } = await useAsyncData(
  () => `post:${postId.value}`,
  () => {
    if (!postId.value) throw new Error('Post not found.')
    return apiFetchData<GetPostData>(`/posts/${encodeURIComponent(postId.value)}`, { method: 'GET' })
  },
  { watch: [postId], server: true },
)

const post = computed(() => {
  if (isDeleted.value) return null
  return data.value ?? null
})

// Mark notifications whose subject is this post as read (fire-and-forget)
const { markReadBySubject } = useNotifications()
watch(
  () => [post.value?.id, user.value?.id] as const,
  ([pid, uid]) => {
    if (pid && uid) markReadBySubject({ post_id: pid })
  },
  { immediate: true },
)

function onDeleted() {
  isDeleted.value = true
  errorText.value = 'Post deleted.'
  void navigateTo('/home')
}

const isOnlyMe = computed(() => post.value?.visibility === 'onlyMe')

const routeQuery = computed(() => route.query)
const showReplyComposer = computed(() => routeQuery.value?.reply === '1' && !isOnlyMe.value)

const threadParticipants = ref<GetThreadParticipantsData>([])
async function fetchThreadParticipants() {
  if (!post.value?.id || isOnlyMe.value) return
  try {
    const res = await apiFetchData<GetThreadParticipantsData>(
      `/posts/${encodeURIComponent(post.value.id)}/thread-participants`,
      { method: 'GET' },
    )
    threadParticipants.value = Array.isArray(res) ? res : []
  } catch {
    threadParticipants.value = []
  }
}

const replyContext = computed(() => {
  if (!post.value || !showReplyComposer.value) return null
  const usernames = threadParticipants.value.map((p) => p.username).filter(Boolean)
  return {
    parentId: post.value.id,
    visibility: post.value.visibility,
    mentionUsernames: usernames,
  }
})

/** Thread participants to show as "Replying to @userA, @userB" (exclude self). */
const replyingToDisplay = computed(() => {
  const myUsername = user.value?.username
  if (!myUsername) return threadParticipants.value
  return threadParticipants.value.filter((p) => p.username?.toLowerCase() !== myUsername.toLowerCase())
})

function participantLinkClass(p: { id: string; username: string }): string {
  const author = post.value?.author
  if (author?.id === p.id && author?.premium) return '!text-[var(--moh-premium)]'
  if (author?.id === p.id && author?.verifiedStatus && author.verifiedStatus !== 'none') return '!text-[var(--moh-verified)]'
  return ''
}

const comments = ref<FeedPost[]>([])
const commentsNextCursor = ref<string | null>(null)
const commentsLoading = ref(false)
const commentsCounts = ref<ApiPagination['counts']>(null)

const commentsSort = useCookie<'new' | 'trending'>('moh.post.comments.sort.v1', {
  default: () => 'new',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

// Comments inherit parent post visibility, so we always show total count.
const commentCountDisplay = computed(() => {
  const c = commentsCounts.value
  return c ? c.all : (post.value?.commentCount ?? 0)
})

async function fetchComments(cursor: string | null = null) {
  if (!post.value?.id || isOnlyMe.value) return
  if (cursor === null) commentsLoading.value = true
  try {
    const params = new URLSearchParams({
      limit: '30',
      visibility: 'all',
      sort: commentsSort.value,
    })
    if (cursor) params.set('cursor', cursor)
    const res = await apiFetch<GetPostCommentsData>(
      `/posts/${encodeURIComponent(post.value.id)}/comments?${params.toString()}`,
      { method: 'GET' }
    )
    const list = res.data ?? []
    if (cursor === null) {
      comments.value = list
    } else {
      comments.value = [...comments.value, ...list]
    }
    commentsNextCursor.value = res.pagination?.nextCursor ?? null
    commentsCounts.value = res.pagination?.counts ?? null
  } catch {
    if (cursor === null) comments.value = []
    commentsNextCursor.value = null
  } finally {
    commentsLoading.value = false
  }
}

function loadMoreComments() {
  if (!commentsNextCursor.value || commentsLoading.value) return
  void fetchComments(commentsNextCursor.value)
}

async function onCommentsSortChange(next: 'new' | 'trending') {
  commentsSort.value = next
  commentsNextCursor.value = null
  await fetchComments(null)
}

async function onCommentsFilterReset() {
  commentsSort.value = 'new'
  commentsNextCursor.value = null
  await fetchComments(null)
}

const { bumpCommentCount } = usePostCountBumps()

async function createComment(
  body: string,
  visibility: import('~/types/api').PostVisibility,
  media: import('~/composables/composer/types').CreateMediaPayload[],
): Promise<FeedPost | null> {
  if (!post.value?.id) return null
  const res = await apiFetchData<FeedPost>('/posts', {
    method: 'POST',
    body: {
      body,
      visibility,
      parent_id: post.value.id,
      mentions: replyContext.value?.mentionUsernames,
      media,
    },
  })
  return res ?? null
}

function onReplyPosted(payload: { id: string; post?: FeedPost }) {
  const p = post.value
  if (p?.id) {
    bumpCommentCount(p.id)
    if (data.value) {
      data.value = { ...data.value, commentCount: (data.value.commentCount ?? 0) + 1 }
    }
  }
  if (payload.post) {
    comments.value = [payload.post, ...comments.value]
    if (commentsCounts.value) {
      commentsCounts.value = { ...commentsCounts.value, all: commentsCounts.value.all + 1 }
    }
  } else {
    void fetchComments(null)
  }
  void fetchThreadParticipants()
}

function onCommentDeleted(commentId: string) {
  comments.value = comments.value.filter((c) => c.id !== commentId)
  if (commentsCounts.value) {
    commentsCounts.value = { ...commentsCounts.value, all: Math.max(0, commentsCounts.value.all - 1) }
  }
}

const { registerOnReplyPosted, unregisterOnReplyPosted } = useReplyModal()
onMounted(() => {
  if (!import.meta.client) return
  registerOnReplyPosted((payload) => {
    if (payload.post?.parentId === post.value?.id) {
      onReplyPosted(payload)
    }
  })
})
onBeforeUnmount(() => {
  unregisterOnReplyPosted()
})

watch(postId, () => {
  isDeleted.value = false
})

watch(
  () => [post.value?.id, isOnlyMe.value] as const,
  ([id, onlyMe]) => {
    if (id && !onlyMe) {
      void fetchThreadParticipants()
      void fetchComments(null)
    } else {
      comments.value = []
      commentsNextCursor.value = null
      threadParticipants.value = []
    }
  },
  { immediate: true },
)

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

  // Set response status for server/network errors so crawlers get 5xx.
  if (import.meta.server && (status >= 500 || status === 0)) {
    const event = useRequestEvent()
    if (event) setResponseStatus(event, 503)
  }
} else {
  errorText.value = null
}

const apiErrorStatus = computed(() => {
  const e: any = error.value
  return Number(e?.statusCode ?? e?.status ?? e?.response?.status ?? 0)
})
const showServerErrorCta = computed(
  () =>
    Boolean(errorText.value) &&
    accessHint.value === 'none' &&
    (apiErrorStatus.value >= 500 || apiErrorStatus.value === 0),
)

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

// Best media by size (width*height) for og:image; expose thumbnailUrl for video poster, dimensions for og:image:width/height.
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

// First video in post media for og:video / twitter:player.
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

// Extra og:image URLs (other images, GIFs, video thumbnails) so platforms can pick/rotate; cap to avoid huge payloads.
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
    try {
      return await apiFetchData<LinkMetadata | null>('/link-metadata', {
        method: 'GET',
        query: { url },
        timeout: 3000,
      })
    } catch {
      return null
    }
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

usePostPermalinkSeo({
  postId,
  post,
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

