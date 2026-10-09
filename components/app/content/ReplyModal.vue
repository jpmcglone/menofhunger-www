<template>
  <ClientOnly>
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="replyModal.open.value && parentPost"
        class="z-[var(--moh-z-modal)]"
        :style="overlayStyle"
        aria-label="Reply modal"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/55"
          aria-hidden="true"
          @click="close"
        />

        <!-- Definite bounds let the body shrink while Close and Reply stay above the keyboard. -->
        <div
          class="reply-sheet absolute inset-0 flex flex-col overflow-hidden moh-border moh-surface sm:inset-y-3 sm:max-h-[40rem] sm:rounded-2xl sm:border"
          :style="replySheetStyle"
        >
          <div class="moh-gutter-x flex shrink-0 items-center justify-between py-1 sm:py-3">
            <button type="button" class="moh-focus moh-surface-hover flex h-11 w-11 items-center justify-center rounded-full moh-text" aria-label="Close reply" @click="close">
              <Icon name="tabler:x" class="text-xl" aria-hidden="true" />
            </button>
            <div ref="replySubmitEl" class="sm:hidden" />
          </div>
          <div
            class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar"
            @click.capture="onSheetClick"
          >
            <div class="moh-gutter-x">
              <AppReplyParentPreview :post="parentPost" connect-to-reply>
                <template #default>
                  <span v-if="replyingToDisplay.length">
                    Replying to
                    <template v-for="(p, i) in replyingToDisplay" :key="p.id">
                      <NuxtLink
                        :to="`/u/${encodeURIComponent(p.username)}`"
                        class="font-semibold hover:underline underline-offset-2"
                        :class="participantLinkClass(p)"
                        :aria-label="`View @${p.username} profile`"
                        @mouseenter="(e) => multiTrigger.onEnter(p.username, e)"
                        @mousemove="multiTrigger.onMove"
                        @mouseleave="multiTrigger.onLeave"
                      >
                        @{{ p.username }}
                      </NuxtLink>
                      <span v-if="i < replyingToDisplay.length - 1" class="moh-text-muted">, </span>
                    </template>
                  </span>
                </template>
              </AppReplyParentPreview>
            </div>
            <div>
              <AppPostComposer
                v-if="replyContext"
                ref="replyComposerRef"
                class="reply-composer"
                :reply-to="replyContext"
                :actions-target="replyActionsEl"
                :submit-target="isMobileReply ? replySubmitEl : null"
                auto-focus
                :show-divider="false"
                in-reply-thread
                @pending="onReplyPending"
                @posted="onReplyPosted"
              />
            </div>
          </div>
          <div ref="replyActionsEl" class="moh-gutter-x shrink-0 border-t moh-border moh-surface py-1 sm:py-2" />
        </div>
      </div>
    </Transition>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { FeedPost, GetThreadParticipantsData } from '~/types/api'
import type { ReplyPostedPayload } from '~/composables/useReplyModal'
import { useReplyModal } from '~/composables/useReplyModal'
import { useApiClient } from '~/composables/useApiClient'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { usePendingPostsManager } from '~/composables/usePendingPostsManager'
import { useKeyboardPinnedFixedStyle } from '~/composables/useKeyboardHeight'
import { userColorTier, userTierTextClass } from '~/utils/user-tier'
import { feedPostThreadGroupDisplayName } from '~/utils/community-group-preview'

import { excludeMarvUsername, excludeMarvUsernameStrings } from '~/utils/exclude-marv-username'

const replyModal = useReplyModal()
const multiTrigger = useUserPreviewMultiTrigger()
const { apiFetchData } = useApiClient()
const { user } = useAuth()
const { marvUsername } = useMarv()
const middleScrollerRef = useMiddleScroller()
// Same pin/shrink as the app shell — this overlay renders *outside* the shell.
const { style: overlayStyle } = useKeyboardPinnedFixedStyle()

const parentPost = computed(() => replyModal.parentPost.value)
const { user: parentAuthor } = useUserOverlay(computed(() => parentPost.value?.author ?? null))

const parentAuthorUsername = computed(() => parentAuthor.value?.username ?? null)
const parentAuthorProfilePath = computed(() =>
  parentAuthorUsername.value ? `/u/${encodeURIComponent(parentAuthorUsername.value)}` : null
)
const parentAuthorLinkClass = computed(() => {
  const author = parentAuthor.value
  if (!author) return ''
  return userTierTextClass(userColorTier(author), { fallback: '' })
})

/** Thread participants to show as "Replying to @userA, @userB" (exclude self). */
const replyingToDisplay = computed(() => {
  const myUsername = user.value?.username?.toLowerCase()
  const extras = replyModal.extraMentionUsernames.value ?? []

  // Build a list: extras first (as minimal objects), then thread participants — deduped, self excluded.
  const seen = new Set<string>()
  const result: { id: string; username: string }[] = []

  for (const username of extras) {
    const key = username.toLowerCase()
    if (myUsername && key === myUsername) continue
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ id: `extra:${username}`, username })
  }

  for (const p of threadParticipants.value) {
    const key = (p.username ?? '').toLowerCase()
    if (!key) continue
    if (myUsername && key === myUsername) continue
    if (seen.has(key)) continue
    seen.add(key)
    result.push(p)
  }

  return excludeMarvUsername(result, marvUsername.value)
})

function participantLinkClass(p: { id: string; username: string }): string {
  const author = parentPost.value?.author
  if (author?.id === p.id) return parentAuthorLinkClass.value
  return ''
}

const isMobileReply = ref(false)
const replySubmitEl = ref<HTMLElement | null>(null)
const replySheetStyle = ref<Record<string, string>>({ left: '0px', width: 'auto' })

function updateReplySheetStyle() {
  if (!import.meta.client) return
  isMobileReply.value = window.matchMedia('(max-width: 639px)').matches
  if (isMobileReply.value) {
    replySheetStyle.value = { left: '0px', width: '100%' }
    return
  }
  const el = middleScrollerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  replySheetStyle.value = {
    left: `${Math.max(0, Math.floor(r.left))}px`,
    width: `${Math.max(0, Math.floor(r.width))}px`,
  }
}


function close() {
  stopTyping()
  replyModal.hide()
}

const replyActionsEl = ref<HTMLElement | null>(null)
const replyComposerRef = ref<{ hasUnsavedContent: boolean; draftText?: string } | null>(null)

async function onSheetClick(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target : null
  const anchor = target?.closest('a')
  if (!anchor) return
  const href = anchor.getAttribute('href') ?? anchor.href
  if (!href) return
  const hasUnsaved = replyComposerRef.value?.hasUnsavedContent ?? false
  if (hasUnsaved) {
    event.preventDefault()
    event.stopPropagation()
    if (!confirm('Discard your reply?')) return
    await navigateTo(href)
    close()
  } else {
    close()
  }
}

const threadParticipants = ref<GetThreadParticipantsData>([])

async function fetchThreadParticipants() {
  const post = parentPost.value
  if (!post?.id) {
    threadParticipants.value = []
    return
  }
  try {
    const res = await apiFetchData<GetThreadParticipantsData>(
      `/posts/${encodeURIComponent(post.id)}/thread-participants`,
      { method: 'GET' },
    )
    threadParticipants.value = Array.isArray(res) ? res : []
  } catch {
    threadParticipants.value = []
  }
}

const replyContext = computed(() => {
  const post = parentPost.value
  if (!post) return null
  const threadUsernames = (threadParticipants.value ?? []).map((p) => p.username).filter(Boolean)
  // Merge extras (e.g. reposter when replying to a flat repost) — deduplicated, extras first.
  const extras = replyModal.extraMentionUsernames.value ?? []
  const seen = new Set<string>()
  const merged: string[] = []
  for (const u of [...extras, ...threadUsernames]) {
    const key = u.toLowerCase()
    if (!seen.has(key)) { seen.add(key); merged.push(u) }
  }
  return {
    parentId: post.id,
    visibility: post.visibility,
    mentionUsernames: excludeMarvUsernameStrings(merged, marvUsername.value),
    groupDisplayName: feedPostThreadGroupDisplayName(post),
  }
})

watch(
  () => [replyModal.open.value, parentPost.value] as const,
  ([open, post]) => {
    if (open && post?.id) {
      void fetchThreadParticipants()
    } else {
      threadParticipants.value = []
    }
  },
  { immediate: true },
)

useOverlayDismiss(replyModal.open, close)

watch(
  () => replyModal.open.value,
  (open) => {
    if (!import.meta.client) return
    window.removeEventListener('resize', updateReplySheetStyle)
    window.visualViewport?.removeEventListener('resize', updateReplySheetStyle)
    if (open) {
      requestAnimationFrame(() => updateReplySheetStyle())
      window.addEventListener('resize', updateReplySheetStyle)
      window.visualViewport?.addEventListener('resize', updateReplySheetStyle)
    }
  },
  { flush: 'post' },
)

onUnmounted(() => {
  if (!import.meta.client) return
  window.removeEventListener('resize', updateReplySheetStyle)
  window.visualViewport?.removeEventListener('resize', updateReplySheetStyle)
})

const pendingPosts = usePendingPostsManager()

// ─── Typing presence ─────────────────────────────────────────────────────────
const { notifyTyping, stopTyping } = usePostTyping(computed(() => parentPost.value?.id))

watch(
  () => replyComposerRef.value?.draftText ?? '',
  (text) => notifyTyping(text),
)

function onReplyPosted(payload: ReplyPostedPayload) {
  stopTyping()
  const cbs = replyModal.onReplyPostedCallbacks.value
  if (cbs.length) {
    for (const cb of cbs) cb(payload)
  }
  replyModal.hide()
}

/**
 * Optimistic reply path. The composer fires `pending` immediately on submit
 * (clearing itself), we close the modal, then either:
 *  - hand the payload off to a registered consumer (e.g. home/group feeds)
 *    that knows how to slot the optimistic row in via `addReply` and run
 *    `perform` through `usePendingPostsManager`; or
 *  - fall back to a built-in handler that just runs `perform` and surfaces
 *    the real post via the existing `onReplyPosted` callback chain. This
 *    keeps consumers that haven't migrated to the pending flow (e.g. the
 *    permalink page, comment thread previews) working — they get the modal
 *    closing instantly, then the row appears once the server responds.
 */
function onReplyPending(payload: {
  localId: string
  optimisticPost: FeedPost
  perform: () => Promise<FeedPost | { id: string } | null | undefined>
}) {
  const parent = parentPost.value
  if (!parent) return
  const enriched: FeedPost = {
    ...payload.optimisticPost,
    parent,
    visibility: parent.visibility,
  }
  const fullPayload = {
    localId: payload.localId,
    optimisticPost: enriched,
    parentPost: parent,
    perform: payload.perform,
  }

  const cbs = replyModal.onReplyPendingCallbacks.value
  if (cbs.length) {
    for (const cb of cbs) cb(fullPayload)
  } else {
    pendingPosts.submit({
      localId: fullPayload.localId,
      optimisticPost: fullPayload.optimisticPost,
      perform: fullPayload.perform,
      callbacks: {
        insert: () => {},
        replace: () => {},
        markFailed: () => {},
        markPosting: () => {},
        remove: () => {},
      },
      onSuccess: (real) => {
        const postedCbs = replyModal.onReplyPostedCallbacks.value
        if (postedCbs.length) {
          for (const cb of postedCbs) cb({ id: real.id, post: real })
        }
      },
    })
  }
  stopTyping()
  replyModal.hide()
}
</script>

<style scoped>
/* Mobile reply master: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=263-1569
   One scroll owner lets the parent post leave the viewport as the draft grows. */
@media (max-width: 639px) {
  .reply-sheet .reply-composer :deep(.moh-styled-textarea-editor) {
    max-height: none;
    overflow-y: visible;
  }
}
</style>
