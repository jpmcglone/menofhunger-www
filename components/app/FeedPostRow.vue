<template>
  <!-- Single post (no parent): render one row -->
  <div
    v-if="chain.length === 1"
    :ref="highlightedPostId === post.id ? setHighlightedRef : undefined"
  >
    <AppPostRow
      :post="post"
      :highlight="highlightedPostId === post.id"
      :no-padding-top="noPaddingTop"
      :no-border-bottom="showCollapsedFooter"
      :activate-video-on-mount="activateVideoOnMount"
      v-bind="$attrs"
        @deleted="$emit('deleted', $event)"
    />
    <div
      v-if="showCollapsedFooter"
      class="border-b moh-border px-4 pb-3 pt-1"
    >
      <div class="pl-[3.25rem]">
        <NuxtLink
          :to="`/p/${encodeURIComponent(directParentId!)}`"
          class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200"
        >
          <i class="pi pi-comments text-[14px] opacity-70" aria-hidden="true" />
          {{ collapsedRepliesLabel }}
        </NuxtLink>
      </div>
    </div>
  </div>

  <!-- Reply chain A -> B -> C: overlays on each row connect with no gap -->
  <div v-else class="flex flex-col">
    <div
      v-for="(item, i) in chain"
      :key="item.id"
      :ref="item.id === highlightedPostId ? setHighlightedRef : undefined"
    >
      <AppPostRow
        :post="item"
        :highlight="highlightedPostId === item.id"
        :no-border-bottom="i < chain.length - 1 || (i === chain.length - 1 && showCollapsedFooter)"
        :no-padding-top="noPaddingTop || i > 0"
        :no-padding-bottom="i < chain.length - 1"
        :show-thread-line-above-avatar="i > 0"
        :show-thread-line-below-avatar="i < chain.length - 1"
        :thread-line-tint="threadLineTint"
        :activate-video-on-mount="i === chain.length - 1 ? activateVideoOnMount : undefined"
        v-bind="$attrs"
        @deleted="$emit('deleted', $event)"
      />
    </div>
    <div
      v-if="showCollapsedFooter"
      class="border-b moh-border px-4 pb-3 pt-1"
    >
      <div class="pl-[3.25rem]">
        <NuxtLink
          :to="`/p/${encodeURIComponent(directParentId!)}`"
          class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 transition-colors moh-surface-hover dark:text-gray-200"
        >
          <i class="pi pi-comments text-[14px] opacity-70" aria-hidden="true" />
          {{ collapsedRepliesLabel }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

const props = withDefaults(
  defineProps<{
    post: FeedPost
    activateVideoOnMount?: boolean
    collapsedSiblingRepliesCount?: number
    /** Sort context for the collapsed replies footer label ("more new/trending replies"). */
    repliesSort?: 'new' | 'trending' | null
    /** When set, the post with this id is highlighted (e.g. the post being viewed on /p/:id). */
    highlightedPostId?: string | null
    /** Remove top padding from the first row (e.g. on post permalink page). */
    noPaddingTop?: boolean
  }>(),
  { highlightedPostId: null, noPaddingTop: false, collapsedSiblingRepliesCount: 0, repliesSort: null },
)

defineEmits<{
  (e: 'deleted', id: string): void
}>()

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
const directParentId = computed(() => (props.post.parentId ?? '').trim() || null)
const showCollapsedFooter = computed(() => Boolean(collapsedSiblingRepliesCount.value > 0 && directParentId.value))

const collapsedRepliesLabel = computed(() => {
  const n = collapsedSiblingRepliesCount.value
  const noun = n === 1 ? 'reply' : 'replies'
  const qualifier = props.repliesSort === 'trending' ? 'trending' : (props.repliesSort === 'new' ? 'new' : null)
  return `View ${n} more${qualifier ? ` ${qualifier}` : ''} ${noun}`
})

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
</script>
