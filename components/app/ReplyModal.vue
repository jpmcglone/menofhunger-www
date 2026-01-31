<template>
  <Dialog
    :visible="dialogVisible"
    modal
    :draggable="false"
    :closable="true"
    :dismissable-mask="true"
    :style="{ width: 'min(36rem, calc(100vw - 2rem))', maxHeight: '90vh' }"
    class="reply-modal overflow-hidden flex flex-col"
    @update:visible="onVisibleChange"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3 w-full pr-2">
        <h2 class="text-base font-semibold truncate moh-text">
          Reply to @{{ parentPost?.author?.username ?? 'post' }}
        </h2>
        <button
          type="button"
          class="shrink-0 p-2 rounded-full moh-surface-hover"
          aria-label="Close"
          @click="close"
        >
          <i class="pi pi-times text-lg" aria-hidden="true" />
        </button>
      </div>
    </template>

    <div v-if="parentPost" class="flex flex-col overflow-hidden">
      <!-- Parent post (message you're commenting to) -->
      <div class="border-b moh-border shrink-0">
        <AppPostRow :post="parentPost" :clickable="false" />
      </div>

      <!-- Replying to @username + thread line + composer -->
      <div class="flex min-h-0">
        <!-- Thread line: vertical bar connecting parent to reply -->
        <div class="w-10 shrink-0 flex flex-col items-center">
          <div class="w-px flex-1 min-h-[2rem] bg-gray-200 dark:bg-zinc-700" aria-hidden="true" />
        </div>

        <div class="flex-1 min-w-0 flex flex-col border-b moh-border">
          <NuxtLink
            :to="parentProfilePath"
            class="inline-flex items-center gap-1 px-4 pt-2 pb-1 text-sm moh-text-muted hover:underline w-fit"
          >
            Replying to
            <span class="font-medium moh-mention-link">@{{ parentPost.author?.username ?? '' }}</span>
          </NuxtLink>
          <div class="px-0 pb-0">
            <AppPostComposer
              v-if="replyContext"
              :reply-to="replyContext"
              auto-focus
              :show-divider="false"
              @posted="onReplyPosted"
            />
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { FeedPost, GetThreadParticipantsResponse } from '~/types/api'
import { useReplyModal } from '~/composables/useReplyModal'
import { useApiClient } from '~/composables/useApiClient'
import { usePostCountBumps } from '~/composables/usePostCountBumps'

const replyModal = useReplyModal()
const { apiFetchData } = useApiClient()

const parentPost = computed(() => replyModal.parentPost.value)

const dialogVisible = computed({
  get: () => replyModal.open.value,
  set: (v: boolean) => {
    if (!v) replyModal.hide()
  },
})

function onVisibleChange(v: boolean) {
  if (!v) replyModal.hide()
}

function close() {
  replyModal.hide()
}

const parentProfilePath = computed(() => {
  const u = parentPost.value?.author?.username?.trim()
  return u ? `/u/${encodeURIComponent(u)}` : '#'
})

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

const toast = useAppToast()
const { bumpCommentCount } = usePostCountBumps()

function onReplyPosted(payload: { id: string }) {
  const parentId = parentPost.value?.id
  if (parentId) bumpCommentCount(parentId)
  replyModal.hide()
  toast.push({
    title: 'Reply posted',
    message: 'Tap to view.',
    tone: 'public',
    durationMs: 2600,
    to: `/p/${encodeURIComponent(payload.id)}`,
  })
}
</script>

<style scoped>
.reply-modal :deep(.p-dialog-content) {
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}
</style>
