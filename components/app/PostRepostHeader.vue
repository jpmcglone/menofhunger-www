<template>
  <!--
    The gap below this header is 16px at every width, but it comes from two places:
    below `sm` this element supplies it, and at `sm` and up the post row's own
    `sm:py-4` does (its `noPaddingTop` only wins under `sm`, where no media query
    outranks it). Dropping `pb` at `sm` is what keeps the two from stacking to 32px.
  -->
  <div class="flex items-center gap-1.5 px-4 pt-4 pb-4 text-xs moh-text-muted sm:pb-0 lg:pt-2">
    <Icon
      name="tabler:repeat"
      class="text-[13px] shrink-0"
      aria-hidden="true"
      :style="repostHeaderColor ? { color: repostHeaderColor } : undefined"
    />
    <!-- Multi-reposter collapsed label: "Alice, Bob and 3 others reposted" -->
    <template v-if="collapsedAuthors.length >= 2">
      <span :style="repostHeaderColor ? { color: repostHeaderColor } : undefined">
        <NuxtLink
          v-for="(a, idx) in collapsedAuthors.slice(0, 2)"
          :key="a.id"
          :to="`/u/${encodeURIComponent(a.username ?? a.id)}`"
          class="font-semibold hover:underline"
          @click.stop
        >{{ authorLabel(a) }}<template v-if="idx === 0 && collapsedAuthors.length >= 2">, </template></NuxtLink>
        <template v-if="remainingCount > 0"> and {{ remainingCount }} {{ remainingCount === 1 ? 'other' : 'others' }}</template>
        reposted
      </span>
    </template>
    <!-- Single reposter (default) -->
    <template v-else>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'

const props = defineProps<{ post: FeedPost }>()

const { user: authUser } = useAuth()

// ── Multi-reposter collapse ────────────────────────────────────────────────
const collapsedAuthors = computed(() => props.post.repostedByAuthors ?? [])
const remainingCount = computed(() => {
  const total = props.post.repostedByCount ?? collapsedAuthors.value.length
  return Math.max(0, total - 2)
})
function authorLabel(a: { id: string; name?: string | null; username?: string | null }): string {
  if (authUser.value?.id === a.id) return 'You'
  return a.name || a.username || 'Someone'
}

// ── Single reposter (existing behaviour) ──────────────────────────────────
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
