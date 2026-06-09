<template>
  <div
    v-if="replyingToTargets.length > 0"
    class="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] leading-snug text-gray-500 dark:text-gray-400"
  >
    <span>Replying to</span>
    <template v-for="(target, idx) in replyingToTargets" :key="target.username">
      <NuxtLink
        :to="`/u/${encodeURIComponent(target.username)}`"
        class="font-medium hover:underline underline-offset-2"
        :class="target.tierClass"
        @mouseenter="target.onEnter"
        @mousemove="target.onMove"
        @mouseleave="target.onLeave"
      >@{{ target.username }}</NuxtLink>
      <span v-if="idx < replyingToTargets.length - 2" class="select-none">,</span>
      <span v-else-if="idx === replyingToTargets.length - 2" class="select-none">and</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { userColorTier, userTierTextClass } from '~/utils/user-tier'

const props = defineProps<{
  post: FeedPost
}>()

// "Replying to" targets: derived from the parent post's author (and the parent's
// parent, etc.). We collect up to 3 unique usernames from the parent chain so
// the label stays readable.
const replyingToTargets = computed(() => {
  if (!props.post.parentId) return []

  const seen = new Set<string>()
  const targets: Array<ReturnType<typeof useUserPreviewTrigger> & { username: string; tierClass: string }> = []

  // Walk the pre-loaded parent chain (parent → parent.parent → …)
  let node: FeedPost | undefined = props.post.parent
  while (node && targets.length < 3) {
    const username = node.author?.username ?? null
    if (username && !seen.has(username)) {
      seen.add(username)
      const u = username
      const tier = userColorTier(node.author ?? null)
      const tierClass = userTierTextClass(tier, { fallback: 'text-blue-500 dark:text-blue-400' })
      const { onEnter, onMove, onLeave } = useUserPreviewTrigger({ username: computed(() => u) })
      targets.push({ username: u, tierClass, onEnter, onMove, onLeave })
    }
    node = node.parent
  }

  return targets
})
</script>
