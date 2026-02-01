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
              'relative overflow-hidden rounded-2xl border bg-white moh-card-matte dark:bg-black',
              replyModalBorderClass,
            ]"
          >
            <div class="relative z-10 flex flex-col max-h-[min(90vh,40rem)]">
              <div
                class="overflow-y-auto overflow-x-hidden flex flex-col px-4 pt-4 pb-4"
                @click.capture="onSheetClick"
              >
                <!-- Parent post you're replying to (same padding as compose: pl-4 aligns with composer content) -->
                <div class="pt-2 pb-2 pl-4">
                  <AppReplyParentPreview :post="parentPost" />
                </div>
                <!-- Compose (Replying to @username injected via slot above textarea) -->
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
                      Replying to
                      <NuxtLink
                        v-if="parentAuthorUsername"
                        :to="parentAuthorProfilePath"
                        class="font-semibold hover:underline underline-offset-2"
                        :class="parentAuthorLinkClass"
                        :aria-label="`View @${parentAuthorUsername} profile`"
                      >
                        @{{ parentAuthorUsername }}
                      </NuxtLink>
                      <span v-else class="font-semibold">@—</span>
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
import type { FeedPost, GetThreadParticipantsResponse } from '~/types/api'
import type { ReplyPostedPayload } from '~/composables/useReplyModal'
import { useReplyModal } from '~/composables/useReplyModal'
import { useApiClient } from '~/composables/useApiClient'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { useMiddleScroller } from '~/composables/useMiddleScroller'

const replyModal = useReplyModal()
const { apiFetchData } = useApiClient()
const { user } = useAuth()
const middleScrollerRef = useMiddleScroller()

const parentPost = computed(() => replyModal.parentPost.value)

const parentAuthorUsername = computed(() => parentPost.value?.author?.username ?? null)
const parentAuthorProfilePath = computed(() =>
  parentAuthorUsername.value ? `/u/${encodeURIComponent(parentAuthorUsername.value)}` : null
)
const parentAuthorLinkClass = computed(() => {
  const author = parentPost.value?.author
  if (!author) return ''
  if (author.premium) return 'text-[var(--moh-premium)]'
  if (author.verifiedStatus && author.verifiedStatus !== 'none') return 'text-[var(--moh-verified)]'
  return ''
})

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
  return 'border-gray-200 dark:border-zinc-800'
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

const threadParticipants = ref<GetThreadParticipantsResponse['participants']>([])

async function fetchThreadParticipants() {
  const post = parentPost.value
  if (!post?.id) {
    threadParticipants.value = []
    return
  }
  try {
    const res = await apiFetchData<GetThreadParticipantsResponse>(
      `/posts/${encodeURIComponent(post.id)}/thread-participants`,
      { method: 'GET' },
    )
    threadParticipants.value = res.participants ?? []
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
