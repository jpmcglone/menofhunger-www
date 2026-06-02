<template>
  <div class="flex gap-3">
    <div v-if="!contentOnly" class="shrink-0" aria-hidden="true">
      <AppUserAvatar
        :user="author"
        size-class="h-10 w-10"
        bg-class="moh-surface"
      />
    </div>
    <div class="min-w-0 flex-1">
      <!-- Group context chip (matches PostRow) — shows which group this post lives in. -->
      <div
        v-if="feedGroupTag"
        class="relative mb-1.5 flex items-center"
      >
        <NuxtLink
          :to="`/g/${encodeURIComponent(feedGroupTag.slug)}`"
          class="inline-flex max-w-full items-center gap-1.5 rounded-full border moh-border bg-black/[0.025] py-0.5 pl-0.5 pr-2 -ml-0.5 text-left shadow-sm shadow-black/[0.03] transition-colors hover:bg-black/[0.05] dark:bg-white/[0.045] dark:shadow-black/20 dark:hover:bg-white/[0.075]"
          :aria-label="`Group: ${feedGroupTag.name}`"
          @click.stop
          @mouseenter="onGroupEnter"
          @mousemove="onGroupMove"
          @mouseleave="onGroupLeave"
        >
          <div
            class="h-[18px] w-[18px] shrink-0 overflow-hidden bg-gray-200 dark:bg-zinc-700 moh-img-outline"
            :class="groupAvatarRoundClass"
          >
            <img
              v-if="feedGroupTag.avatarImageUrl"
              :src="feedGroupTag.avatarImageUrl"
              alt=""
              class="h-full w-full object-cover"
              loading="lazy"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-[8px] font-bold text-gray-500 dark:text-zinc-400"
            >
              {{ feedGroupInitials }}
            </div>
          </div>
          <span class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500" aria-hidden="true">
            in
          </span>
          <span class="whitespace-nowrap text-xs font-semibold text-gray-700 dark:text-zinc-200">
            {{ feedGroupTag.name }}
          </span>
        </NuxtLink>
      </div>
      <div class="flex min-w-0 items-baseline gap-2 leading-[1.15] flex-wrap">
        <NuxtLink
          v-if="authorProfilePath"
          :to="authorProfilePath"
          class="font-bold truncate moh-text hover:underline underline-offset-2"
          :aria-label="`View @${author?.username ?? ''} profile`"
          @mouseenter="onEnter"
          @mousemove="onMove"
          @mouseleave="onLeave"
        >
          {{ displayName }}
        </NuxtLink>
        <span
          v-else
          class="font-bold truncate moh-text"
          @mouseenter="onEnter"
          @mousemove="onMove"
          @mouseleave="onLeave"
        >{{ displayName }}</span>
        <NuxtLink
          v-if="authorProfilePath"
          :to="authorProfilePath"
          class="inline-flex shrink-0 items-center"
          aria-label="View profile (verified badge)"
        >
          <AppVerifiedBadge
            :status="author?.verifiedStatus ?? 'none'"
            :premium="author?.premium ?? false"
            :premium-plus="author?.premiumPlus ?? false"
            :is-organization="Boolean((author as any)?.isOrganization)"
            :steward-badge-enabled="author?.stewardBadgeEnabled ?? true"
          />
        </NuxtLink>
        <AppVerifiedBadge
          v-else
          :status="author?.verifiedStatus ?? 'none'"
          :premium="author?.premium ?? false"
          :premium-plus="author?.premiumPlus ?? false"
          :is-organization="Boolean((author as any)?.isOrganization)"
          :steward-badge-enabled="author?.stewardBadgeEnabled ?? true"
        />
        <NuxtLink
          v-if="authorProfilePath"
          :to="authorProfilePath"
          class="text-sm moh-text-muted truncate hover:underline underline-offset-2"
          :aria-label="`View @${author?.username ?? ''} profile`"
          @mouseenter="onEnter"
          @mousemove="onMove"
          @mouseleave="onLeave"
        >
          @{{ author?.username ?? '—' }}
        </NuxtLink>
        <span
          v-else
          class="text-sm moh-text-muted truncate"
          @mouseenter="onEnter"
          @mousemove="onMove"
          @mouseleave="onLeave"
        >@{{ author?.username ?? '—' }}</span>
        <span class="shrink-0 text-sm moh-text-muted" aria-hidden="true">·</span>
        <NuxtLink
          v-if="post.id && postPermalink"
          :to="postPermalink"
          class="shrink-0 text-sm moh-text-muted whitespace-nowrap hover:underline underline-offset-2"
          :aria-label="`View post`"
        >
          {{ createdAtShort }}
        </NuxtLink>
        <span v-else class="shrink-0 text-sm moh-text-muted whitespace-nowrap">{{ createdAtShort }}</span>
      </div>
      <!-- "Replying to" line (matches PostRow) — when this post is itself a reply. -->
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
      <AppPostRowBody
        :body="post.body"
        :has-media="Boolean(post.media?.length)"
        :mentions="post.mentions"
        :visibility="post.visibility"
      />
      <AppPostMediaGrid
        v-if="post.media?.length"
        :media="post.media"
        compact
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommunityGroupShell, FeedPost } from '~/types/api'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { groupPreviewToFeedShell } from '~/utils/community-group-preview'
import { groupAvatarRoundClass as getGroupAvatarRoundClass } from '~/utils/avatar-rounding'
import { userColorTier, userTierTextClass } from '~/utils/user-tier'

const props = withDefaults(
  defineProps<{
    post: FeedPost
    /** When true, omit the avatar (used when parent renders avatar in shared thread column). */
    contentOnly?: boolean
  }>(),
  { contentOnly: false }
)

const groupAvatarRoundClass = getGroupAvatarRoundClass()

// Group context for the post being replied to — mirrors PostRow's chip.
// Unlike a feed row, this preview lives in a floating reply composer that can be
// opened from anywhere (incl. the group's own wall), so we always show the chip:
// the surrounding context isn't visible behind the sheet.
const feedGroupTag = computed((): CommunityGroupShell | null => {
  const gp = props.post.groupPreview ?? null
  return gp ? groupPreviewToFeedShell(gp) : null
})
const feedGroupInitials = computed(() => {
  const n = (feedGroupTag.value?.name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})
const { onEnter: onGroupEnter, onMove: onGroupMove, onLeave: onGroupLeave } = useGroupPreviewTrigger({
  shell: feedGroupTag,
})

// "Replying to" targets when the previewed post is itself a reply — mirrors PostRow.
// Walk the pre-loaded parent chain and collect up to 3 unique, tier-colored usernames.
const replyingToTargets = computed(() => {
  if (!props.post.parentId) return []

  const seen = new Set<string>()
  const targets: Array<ReturnType<typeof useUserPreviewTrigger> & { username: string; tierClass: string }> = []

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

const { user: author } = useUserOverlay(computed(() => props.post.author))
const displayName = computed(() => author.value?.name || author.value?.username || 'User')
const authorProfilePath = computed(() => {
  const u = author.value?.username
  return u ? `/u/${encodeURIComponent(u)}` : null
})
const postPermalink = computed(() =>
  props.post?.id ? `/p/${encodeURIComponent(props.post.id)}` : null
)

const { onEnter, onMove, onLeave } = useUserPreviewTrigger({
  username: computed(() => author.value?.username ?? ''),
})

const { addInterest, removeInterest } = usePresence()
const authorId = computed(() => props.post?.author?.id ?? null)
onMounted(() => {
  const id = authorId.value
  if (id) addInterest([id])
})
onBeforeUnmount(() => {
  const id = authorId.value
  if (id) removeInterest([id])
})

// SSR-safe: use shared nowMs so server and client render identical relative times.
const { nowMs } = useNowTicker({ everyMs: 15_000 })

const createdAtShort = computed(() => {
  const d = new Date(props.post.createdAt)
  const nowVal = nowMs.value
  const diffMs = Math.max(0, nowVal - d.getTime())
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  const sameYear = new Date(nowVal).getFullYear() === d.getFullYear()
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
})
</script>
