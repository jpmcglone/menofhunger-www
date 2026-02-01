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
      :activate-video-on-mount="activateVideoOnMount"
      v-bind="$attrs"
      @deleted="$emit('deleted', $event)"
    />
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
        :no-border-bottom="i < chain.length - 1"
        :no-padding-top="noPaddingTop || i > 0"
        :no-padding-bottom="i < chain.length - 1"
        :show-thread-line-above-avatar="i > 0"
        :show-thread-line-below-avatar="i < chain.length - 1"
        :thread-line-tint="threadLineTint"
        :activate-video-on-mount="i === chain.length - 1 ? activateVideoOnMount : undefined"
        v-bind="$attrs"
        @deleted="$emit('deleted', leafId)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

const props = withDefaults(
  defineProps<{
    post: FeedPost
    activateVideoOnMount?: boolean
    /** When set, the post with this id is highlighted (e.g. the post being viewed on /p/:id). */
    highlightedPostId?: string | null
    /** Remove top padding from the first row (e.g. on post permalink page). */
    noPaddingTop?: boolean
  }>(),
  { highlightedPostId: null, noPaddingTop: false },
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

/** Leaf post id (the feed item we represent); emit this when any row in the block is deleted. */
const leafId = computed(() => props.post.id)

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
