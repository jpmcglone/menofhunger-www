<template>
  <div class="flex items-center gap-1.5 px-4 pt-4 pb-0 text-xs moh-text-muted lg:pt-2">
    <Icon
      name="tabler:repeat"
      class="text-[13px] shrink-0"
      aria-hidden="true"
      :style="repostHeaderColor ? { color: repostHeaderColor } : undefined"
    />
    <NuxtLink
      v-if="reposterUsername"
      :to="`/u/${encodeURIComponent(reposterUsername)}`"
      class="font-semibold truncate hover:underline"
      :style="reposterNameColor ? { color: reposterNameColor } : undefined"
      @click.stop
      @mouseenter="onReposterEnter"
      @mousemove="onReposterMove"
      @mouseleave="onReposterLeave"
    >{{ reposterName }}</NuxtLink>
    <span v-else class="font-semibold truncate" :style="reposterNameColor ? { color: reposterNameColor } : undefined">{{ reposterName }}</span>
    <span :style="repostHeaderColor ? { color: repostHeaderColor } : undefined">reposted</span>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'

const props = defineProps<{ post: FeedPost }>()

const { user: authUser } = useAuth()

const reposterUsername = computed(() => props.post.author?.username ?? null)
const reposterIsMe = computed(() =>
  Boolean(authUser.value?.id && authUser.value.id === props.post.author?.id),
)
const reposterName = computed(() => {
  if (reposterIsMe.value) return 'You'
  return (props.post.author?.name || props.post.author?.username) ?? 'Someone'
})
const reposterNameColor = computed(() => {
  const author = reposterIsMe.value ? authUser.value : props.post.author
  return userTierColorVar(userColorTier(author ?? null))
})
const repostHeaderColor = computed(() => {
  const v = props.post.repostedPost?.visibility ?? props.post.visibility
  if (v === 'verifiedOnly') return 'var(--moh-verified)'
  if (v === 'premiumOnly') return 'var(--moh-premium)'
  if (v === 'onlyMe') return 'var(--moh-onlyme)'
  return undefined
})

const { onEnter: onReposterEnter, onMove: onReposterMove, onLeave: onReposterLeave } =
  useUserPreviewTrigger({ username: reposterUsername })
</script>
