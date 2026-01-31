<template>
  <Dialog
    :visible="dialogVisible"
    modal
    :draggable="false"
    :closable="false"
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
      <div class="px-4 pt-2 pb-2 shrink-0">
        <AppReplyParentPreview :post="parentPost" />
      </div>
      <AppPostComposer
        v-if="replyContext"
        :reply-to="replyContext"
        auto-focus
        :show-divider="false"
        @posted="onReplyPosted"
      />
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

const replyPlaceholder = computed(
  () => `Reply to @${parentPost.value?.author?.username ?? 'post'}…`,
)

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
