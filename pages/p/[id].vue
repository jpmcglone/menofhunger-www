<template>
  <AppPageContent top="standard" bottom="standard">
  <div class="w-full">
    <div v-if="errorText" class="px-4 mt-4">
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
            You'll be returned here after logging in.
          </div>
        </div>
        <div v-else-if="showServerErrorCta" class="mt-4 flex flex-wrap items-center gap-3">
          <NuxtLink to="/status" class="text-sm font-medium moh-text underline underline-offset-2">
            Check status
          </NuxtLink>
          <button
            type="button"
            class="text-sm font-medium moh-text-muted hover:opacity-90 underline underline-offset-2"
            @click="reloadPage"
          >
            Try again
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="post">
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
              Replies
              <span class="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {{ commentCountDisplay }}
              </span>
            </div>
            <AppFeedFiltersBar
              :sort="commentsSort"
              :filter="'all'"
              :viewer-is-verified="viewerIsVerified"
              :viewer-is-premium="viewerIsPremium"
              :sort-noun="{ singular: 'reply', plural: 'replies' }"
              :sort-count="commentCountDisplay"
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
            No replies yet.
          </div>
          <template v-else>
          <div v-for="c in comments" :key="c.id">
            <AppPostRow :post="c" @deleted="onCommentDeleted" />
          </div>
          <div v-if="commentsNextCursor" class="flex justify-center px-4 py-4">
            <Button
              label="Load more replies"
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
  </AppPageContent>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { usePostPermalink, usePostPermalinkMedia } from '~/composables/usePostPermalink'
import { usePostComments } from '~/composables/usePostComments'
import { useThreadParticipants } from '~/composables/useThreadParticipants'
import { usePostPermalinkSeo } from '~/composables/usePostPermalinkSeo'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { useReplyModal } from '~/composables/useReplyModal'
import type { LinkMetadata } from '~/utils/link-metadata'

definePageMeta({
  layout: 'app',
  title: 'Post',
})

const route = useRoute()
const requestURL = useRequestURL()
const postId = computed(() => String(route.params.id || '').trim())
const { apiFetchData } = useApiClient()
const highlightedPostRef = ref<HTMLElement | null>(null)

const { user, ensureLoaded } = useAuth()
await ensureLoaded()

const isAuthed = computed(() => Boolean(user.value?.id))
const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const viewerIsPremium = computed(() => Boolean(user.value?.premium))

const {
  post,
  data,
  errorText,
  accessHint,
  isDeleted,
  isOnlyMe,
  apiErrorStatus,
} = await usePostPermalink(postId)

const { markReadBySubject } = useNotifications()
watch(
  () => [post.value?.id, user.value?.id] as const,
  ([pid, uid]) => {
    if (pid && uid) markReadBySubject({ post_id: pid })
  },
  { immediate: true },
)

function onDeleted() {
  if (data.value) {
    data.value = {
      ...data.value,
      deletedAt: new Date().toISOString(),
      body: '',
      media: [],
      mentions: [],
    }
  }
}

const routeQuery = computed(() => route.query)
const showReplyComposer = computed(() => routeQuery.value?.reply === '1' && !isOnlyMe.value && !isDeleted.value)

const {
  threadParticipants,
  replyingToDisplay,
  fetchThreadParticipants,
} = useThreadParticipants({
  post,
  isOnlyMe,
  currentUsername: computed(() => user.value?.username),
})

const replyContext = computed(() => {
  if (!post.value || !showReplyComposer.value) return null
  const usernames = threadParticipants.value.map((p) => p.username).filter(Boolean)
  return {
    parentId: post.value.id,
    visibility: post.value.visibility,
    mentionUsernames: usernames,
  }
})

function participantLinkClass(p: { id: string; username: string }): string {
  const author = post.value?.author
  if (author?.id === p.id && author?.premium) return '!text-[var(--moh-premium)]'
  if (author?.id === p.id && author?.verifiedStatus && author.verifiedStatus !== 'none') return '!text-[var(--moh-verified)]'
  return ''
}

const {
  comments,
  commentsNextCursor,
  commentsLoading,
  commentsCounts,
  commentsSort,
  commentCountDisplay,
  loadMoreComments,
  onCommentsSortChange,
  onCommentsFilterReset,
  onCommentDeleted,
  prependComment,
  fetchComments,
} = usePostComments({
  postId,
  post,
  isOnlyMe,
})

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
    prependComment(payload.post)
  } else {
    void fetchComments(null)
  }
  void fetchThreadParticipants()
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

const isRestricted = computed(() => {
  const v = post.value?.visibility
  if (v === 'verifiedOnly' || v === 'premiumOnly' || v === 'onlyMe') return true
  return accessHint.value !== 'none'
})

const showServerErrorCta = computed(
  () =>
    Boolean(errorText.value) &&
    accessHint.value === 'none' &&
    (apiErrorStatus.value >= 500 || apiErrorStatus.value === 0),
)

const {
  previewLink,
  bodyTextSansLinks,
  primaryMedia,
  extraOgMediaUrls,
  primaryVideo,
} = usePostPermalinkMedia({
  post,
  isRestricted,
  requestURL,
})

const linkMetaKey = computed(() => {
  const u = (previewLink.value ?? '').trim()
  return `post:${postId.value}:linkmeta:${u || 'none'}`
})

const { data: linkMetaData } = await useAsyncData(
  linkMetaKey,
  async () => {
    if (!post.value || isRestricted.value) return null
    if ((post.value.media ?? []).filter((m) => m && !m.deletedAt && (m.url ?? '').trim()).length) return null
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
  { server: true, watch: [previewLink] },
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
  if (v === 'verifiedOnly' || hint === 'verifiedOnly') return 'This post is only available to verified members.'
  if (v === 'premiumOnly' || hint === 'premiumOnly') return 'This post is only available to premium members.'
  if (v === 'onlyMe' || hint === 'private') return 'This post is private and only available to its author.'
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
  return accessHint.value !== 'none'
})

const errorTitle = computed(() => {
  if (!errorText.value) return ''
  if (accessHint.value !== 'none') return restrictionLabel.value
  return 'Post unavailable'
})

const errorBody = computed(() => {
  if (!errorText.value) return ''
  if (accessHint.value !== 'none') {
    const parts: string[] = []
    if (!isAuthed.value) parts.push("You're not logged in.")
    if (accessHint.value === 'verifiedOnly') {
      parts.push(
        isAuthed.value && !viewerIsVerified.value
          ? 'Your account is not verified yet.'
          : 'This post is visible to verified members only.',
      )
    } else if (accessHint.value === 'premiumOnly') {
      parts.push(
        isAuthed.value && !viewerIsPremium.value
          ? "Your account does not have premium access."
          : 'This post is visible to premium members only.',
      )
    } else if (accessHint.value === 'private') {
      parts.push("This post is private. If it's yours, log in to view it.")
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

function reloadPage() {
  if (import.meta.client) globalThis.location?.reload()
}
</script>
