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
        class="fixed inset-0 z-[1000]"
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

        <!-- Reply sheet -->
        <div
          class="absolute top-3"
          :style="replySheetStyle"
        >
          <div
            :class="[
              'relative overflow-hidden rounded-2xl moh-popover moh-card-matte',
              replyModalBorderClass,
            ]"
          >
            <div class="relative z-10 flex flex-col max-h-[min(90vh,40rem)]">
              <div
                class="overflow-y-auto overflow-x-hidden flex flex-col moh-gutter-x pt-4 pb-4"
                @click.capture="onSheetClick"
              >
                <!-- Parent post you're replying to (same padding as compose: pl-4 aligns with composer content) -->
                <div class="pt-2 pb-2 pl-[var(--moh-gutter-x)]">
                  <AppReplyParentPreview :post="parentPost" />
                </div>
                <!-- Compose (Replying to @userA, @userB injected via slot above textarea) -->
                <div>
                  <AppPostComposer
                    v-if="replyContext"
                    ref="replyComposerRef"
                    :reply-to="replyContext"
                    auto-focus
                    :show-divider="false"
                    in-reply-thread
                    @posted="onReplyPosted"
                  >
                    <template #above-textarea>
                      <span v-if="replyingToDisplay.length">
                        Replying to
                        <template v-for="(p, i) in replyingToDisplay" :key="p.id">
                          <NuxtLink
                            :to="`/u/${encodeURIComponent(p.username)}`"
                            class="font-semibold hover:underline underline-offset-2"
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
              </div>
            </div>
          </div>
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
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { userColorTier, userTierTextClass } from '~/utils/user-tier'

const replyModal = useReplyModal()
const { apiFetchData } = useApiClient()
const { user } = useAuth()
const middleScrollerRef = useMiddleScroller()

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
  const myUsername = user.value?.username
  if (!myUsername) return threadParticipants.value
  return threadParticipants.value.filter((p) => p.username?.toLowerCase() !== myUsername.toLowerCase())
})

function participantLinkClass(p: { id: string; username: string }): string {
  const author = parentPost.value?.author
  if (author?.id === p.id) return parentAuthorLinkClass.value
  return ''
}

const replySheetStyle = ref<Record<string, string>>({ left: '0px', width: 'auto' })

function updateReplySheetStyle() {
  if (!import.meta.client) return
  const el = middleScrollerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  replySheetStyle.value = {
    left: `${Math.max(0, Math.floor(r.left))}px`,
    width: `${Math.max(0, Math.floor(r.width))}px`,
  }
}

const replyModalBorderClass = computed(() => {
  const v = parentPost.value?.visibility
  if (v === 'verifiedOnly') return 'moh-thread-verified'
  if (v === 'premiumOnly') return 'moh-thread-premium'
  if (v === 'onlyMe') return 'moh-thread-onlyme'
  return 'moh-border'
})

function close() {
  replyModal.hide()
}

const replyComposerRef = ref<{ hasUnsavedContent: boolean } | null>(null)

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
  const usernames = (threadParticipants.value ?? []).map((p) => p.username).filter(Boolean)
  return {
    parentId: post.id,
    visibility: post.visibility,
    mentionUsernames: usernames,
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

watch(
  () => replyModal.open.value,
  (open) => {
    if (!import.meta.client) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    if (open) {
      window.addEventListener('keydown', onKeyDown)
      requestAnimationFrame(() => updateReplySheetStyle())
      window.addEventListener('resize', updateReplySheetStyle)
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updateReplySheetStyle)
    }
  },
  { flush: 'post' },
)

const { bumpCommentCount } = usePostCountBumps()

function onReplyPosted(payload: ReplyPostedPayload) {
  const cb = replyModal.onReplyPostedCallback.value
  if (cb) {
    cb(payload)
  } else {
    const parentId = parentPost.value?.id
    if (parentId) bumpCommentCount(parentId)
  }
  replyModal.hide()
}
</script>
