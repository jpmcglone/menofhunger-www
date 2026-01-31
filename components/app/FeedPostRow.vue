<template>
  <!-- Single post (no parent): render one row -->
  <template v-if="chain.length === 1">
    <AppPostRow
      :post="post"
      :activate-video-on-mount="activateVideoOnMount"
      v-bind="$attrs"
      @deleted="$emit('deleted', $event)"
    />
  </template>

  <!-- Reply chain A -> B -> C: overlays on each row connect with no gap -->
  <div v-else class="flex flex-col">
    <AppPostRow
      v-for="(item, i) in chain"
      :key="item.id"
      :post="item"
      :no-border-bottom="i < chain.length - 1"
      :no-padding-top="i > 0"
      :no-padding-bottom="i < chain.length - 1"
      :show-thread-line-above-avatar="i > 0"
      :show-thread-line-below-avatar="i < chain.length - 1"
      :activate-video-on-mount="i === chain.length - 1 ? activateVideoOnMount : undefined"
      v-bind="$attrs"
      @deleted="$emit('deleted', leafId)"
    />
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

const props = defineProps<{
  post: FeedPost
  activateVideoOnMount?: boolean
}>()

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
</script>
