<template>
  <div>
    <AppPostRow
      :post="comment"
      :no-border-bottom="Boolean(visibleReplies.length)"
      :show-thread-line-below-avatar="Boolean(visibleReplies.length)"
      @deleted="emit('deleted', $event)"
    >
      <template v-if="showFooterOnParent" #threadFooter>
        <NuxtLink
          :to="commentPermalink"
          class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200"
        >
          <Icon name="tabler:message-circle" class="text-[14px] opacity-70" aria-hidden="true" />
          {{ footerLabel }}
        </NuxtLink>
      </template>
    </AppPostRow>

    <template v-if="visibleReplies.length">
      <AppPostRow
        v-for="(r, idx) in visibleReplies"
        :key="r.id"
        :post="r"
        compact
        no-padding-top
        show-thread-line-above-avatar
        :show-thread-line-below-avatar="idx < visibleReplies.length - 1 || hasMoreHidden"
        @deleted="onNestedDeleted"
      >
        <template v-if="showFooterOnLastVisible && idx === visibleReplies.length - 1" #threadFooter>
          <NuxtLink
            :to="commentPermalink"
            class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200"
          >
            <Icon name="tabler:message-circle" class="text-[14px] opacity-70" aria-hidden="true" />
            {{ footerLabel }}
          </NuxtLink>
        </template>
      </AppPostRow>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost, GetPostCommentsData } from '~/types/api'
import type { ReplyPostedPayload } from '~/composables/useReplyModal'

const props = withDefaults(
  defineProps<{
    comment: FeedPost
    repliesSort?: 'new' | 'trending' | null
  }>(),
  { repliesSort: null },
)
const emit = defineEmits<{
  (e: 'deleted', id: string): void
}>()

const { apiFetch } = useApiClient()
const replyModal = useReplyModal()

const previewReplies = ref<FeedPost[]>([])
const previewLoading = ref(false)
const localCountBump = ref(0)

const totalReplyCount = computed(() => (props.comment.commentCount ?? 0) + localCountBump.value)
const visibleReplies = computed(() => previewReplies.value.slice(0, 1))
const hiddenCount = computed(() => Math.max(0, totalReplyCount.value - visibleReplies.value.length))
const hasMoreHidden = computed(() => hiddenCount.value > 0)
const commentPermalink = computed(() => `/p/${encodeURIComponent(props.comment.id)}`)

function collapsedRepliesLabelFor(n: number) {
  const noun = n === 1 ? 'reply' : 'replies'
  const qualifier = props.repliesSort === 'trending' ? 'trending' : (props.repliesSort === 'new' ? 'new' : null)
  return `View ${n} more${qualifier ? ` ${qualifier}` : ''} ${noun}`
}

const showFooterOnParent = computed(() => hasMoreHidden.value && visibleReplies.value.length === 0)
const showFooterOnLastVisible = computed(() => hasMoreHidden.value && visibleReplies.value.length > 0)
const footerLabel = computed(() => collapsedRepliesLabelFor(hiddenCount.value))

async function fetchPreviewReplies() {
  if (!import.meta.client) return
  if (previewLoading.value) return
  if (totalReplyCount.value <= 0) return
  if (previewReplies.value.length) return

  previewLoading.value = true
  try {
    const params = new URLSearchParams({
      limit: '1',
      visibility: 'all',
      sort: 'new',
    })
    const res = await apiFetch<GetPostCommentsData>(
      `/posts/${encodeURIComponent(props.comment.id)}/comments?${params.toString()}`,
      { method: 'GET' },
    )
    previewReplies.value = Array.isArray(res.data) ? res.data : []
  } catch {
    // Ignore preview errors; nested replies are non-critical on this page.
  } finally {
    previewLoading.value = false
  }
}

function onNestedDeleted(id: string) {
  previewReplies.value = previewReplies.value.filter((p) => p.id !== id)
  if (localCountBump.value > 0) localCountBump.value -= 1
}

let unregisterReplyPosted: null | (() => void) = null
onMounted(() => {
  if (!import.meta.client) return

  void fetchPreviewReplies()

  const cb = (payload: ReplyPostedPayload) => {
    const p = payload.post
    if (!p?.id || p.parentId !== props.comment.id) return

    localCountBump.value += 1
    previewReplies.value = [p, ...previewReplies.value.filter((x) => x.id !== p.id)].slice(0, 3)
  }
  unregisterReplyPosted = replyModal.registerOnReplyPosted(cb)
})
onBeforeUnmount(() => {
  unregisterReplyPosted?.()
  unregisterReplyPosted = null
})

watch(
  () => props.comment.id,
  () => {
    previewReplies.value = []
    localCountBump.value = 0
    void fetchPreviewReplies()
  },
)

watch(
  () => props.comment.commentCount ?? 0,
  (next, prev) => {
    if (!import.meta.client) return
    if (prev <= 0 && next > 0) void fetchPreviewReplies()
    if (next <= 0 && localCountBump.value <= 0) previewReplies.value = []
  },
)
</script>
