<template>
  <!-- Single post (no parent): render one row -->
  <div
    v-if="chain.length === 1"
    :ref="highlightedPostId === post.id ? setHighlightedRef : undefined"
    :data-post-id="post.id"
    :class="keyboardFocusClass"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <AppPostRow
      :post="post"
      :highlight="highlightedPostId === post.id"
      :no-padding-top="noPaddingTop"
      :no-border-bottom="false"
      :activate-video-on-mount="activateVideoOnMount"
      v-bind="$attrs"
        @deleted="$emit('deleted', $event)"
        @edited="$emit('edited', $event)"
    >
      <template v-if="showCollapsedFooter" #threadFooter>
        <NuxtLink
          :to="`/p/${encodeURIComponent(rootPostId!)}`"
          class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200"
        >
          <Icon name="tabler:message-circle" class="text-[14px] opacity-70" aria-hidden="true" />
          {{ collapsedRepliesLabelFor(collapsedSiblingRepliesCount) }}
        </NuxtLink>
      </template>
    </AppPostRow>
  </div>

  <!-- Reply chain A -> B -> C: overlays on each row connect with no gap -->
  <div
    v-else
    class="flex flex-col"
    :data-post-id="post.id"
    :class="keyboardFocusClass"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div
      v-for="(item, i) in chain"
      :key="item.id"
      :ref="item.id === highlightedPostId ? setHighlightedRef : undefined"
    >
      <AppPostRow
        :post="item"
        :highlight="highlightedPostId === item.id"
        :no-border-bottom="i < chain.length - 1"
        :no-padding-top="noPaddingTop || i > 0"
        :no-padding-bottom="i < chain.length - 1"
        :show-thread-line-above-avatar="i > 0"
        :show-thread-line-below-avatar="i < chain.length - 1"
        :thread-line-tint="threadLineTint"
        :activate-video-on-mount="i === chain.length - 1 ? activateVideoOnMount : undefined"
        v-bind="$attrs"
        @deleted="$emit('deleted', $event)"
        @edited="$emit('edited', $event)"
      >
        <template v-if="hiddenRepliesForIndex(i) > 0" #threadFooter>
          <NuxtLink
            :to="`/p/${encodeURIComponent(chain[i]!.id)}`"
            class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200"
          >
            <Icon name="tabler:message-circle" class="text-[14px] opacity-70" aria-hidden="true" />
            {{ collapsedRepliesLabelFor(hiddenRepliesForIndex(i)) }}
          </NuxtLink>
        </template>
      </AppPostRow>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

defineEmits<{
  (e: 'deleted', id: string): void
  (e: 'edited', payload: { id: string; post: FeedPost }): void
}>()

const props = withDefaults(
  defineProps<{
    post: FeedPost
    activateVideoOnMount?: boolean
    collapsedSiblingRepliesCount?: number
    /** Total replies in this feed page by direct parent id (for per-row "View X more" footers). */
    replyCountForParentId?: (parentId: string) => number
    /** Sort context for the collapsed replies footer label ("more new/trending replies"). */
    repliesSort?: 'new' | 'trending' | null
    /** When set, the post with this id is highlighted (e.g. the post being viewed on /p/:id). */
    highlightedPostId?: string | null
    /** Remove top padding from the first row (e.g. on post permalink page). */
    noPaddingTop?: boolean
  }>(),
  { highlightedPostId: null, noPaddingTop: false, collapsedSiblingRepliesCount: 0, repliesSort: null },
)

/** Ordered chain [root, ..., post] by walking parent up. */
const chain = computed(() => {
  const out: FeedPost[] = []
  let p: FeedPost | undefined = props.post
  while (p) {
    out.unshift(p)
    p = p.parent
  }
  return out
})

const collapsedSiblingRepliesCount = computed(() => Math.max(0, Math.floor(props.collapsedSiblingRepliesCount ?? 0)))
const rootPostId = computed(() => chain.value[0]?.id ?? null)
const showCollapsedFooter = computed(() => Boolean(collapsedSiblingRepliesCount.value > 0 && rootPostId.value))

function collapsedRepliesLabelFor(n: number) {
  const noun = n === 1 ? 'reply' : 'replies'
  const qualifier = props.repliesSort === 'trending' ? 'trending' : (props.repliesSort === 'new' ? 'new' : null)
  return `View ${n} more${qualifier ? ` ${qualifier}` : ''} ${noun}`
}

// Back-compat with older render/hot-reload output: some clients may still reference
// `collapsedRepliesLabel` during HMR. Keep it defined to avoid runtime warnings.
const collapsedRepliesLabel = computed(() => collapsedRepliesLabelFor(collapsedSiblingRepliesCount.value))

function hiddenRepliesForIndex(i: number): number {
  const node = chain.value[i]
  if (!node?.id) return 0
  const total = props.replyCountForParentId?.(node.id) ?? 0
  const hasVisibleChild = i < chain.value.length - 1
  return Math.max(0, total - (hasVisibleChild ? 1 : 0))
}

/** Root post visibility (primary post in the thread) for tier-based styling. */
const rootVisibility = computed(() => chain.value[0]?.visibility)

/** Thread line color tint based on root visibility. */
const threadLineTint = computed(() => {
  const v = rootVisibility.value
  if (v === 'verifiedOnly') return 'verified'
  if (v === 'premiumOnly') return 'premium'
  return null
})

/** Ref to the DOM element of the highlighted row (exposed for scroll-into-view on /p/:id). */
const highlightedRowRef = ref<HTMLElement | null>(null)
function setHighlightedRef(el: unknown) {
  highlightedRowRef.value = Array.isArray(el) ? (el?.[0] as HTMLElement | null) ?? null : (el as HTMLElement | null) ?? null
}
defineExpose({ highlightedRowRef })

// Keyboard shortcut focus tracking
const { focusedPostId, focusSource, registerPost, unregisterPost, setFocusedPost, clearFocus } = useKeyboardShortcutsFocusedPost()

const isKeyboardFocused = computed(
  () => focusedPostId.value === props.post.id && focusSource.value === 'keyboard',
)
const keyboardFocusClass = computed(() =>
  isKeyboardFocused.value
    ? 'outline outline-1 outline-[var(--moh-focus-ring)] outline-offset-[-1px]'
    : '',
)

function onMouseEnter() {
  setFocusedPost(props.post.id, 'mouse')
}

function onMouseLeave() {
  if (focusedPostId.value === props.post.id && focusSource.value === 'mouse') {
    clearFocus()
  }
}

onMounted(() => {
  registerPost(props.post)
})

onBeforeUnmount(() => {
  unregisterPost(props.post.id)
})
</script>
