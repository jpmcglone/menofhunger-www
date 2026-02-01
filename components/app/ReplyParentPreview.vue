<template>
  <div class="flex gap-3">
    <div v-if="!contentOnly" class="shrink-0" aria-hidden="true">
      <AppAvatarCircle
        :src="post.author?.avatarUrl ?? null"
        :name="post.author?.name ?? null"
        :username="post.author?.username ?? null"
        size-class="h-10 w-10"
        bg-class="moh-surface"
      />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex min-w-0 items-baseline gap-2 leading-[1.15] flex-wrap">
        <NuxtLink
          v-if="authorProfilePath"
          :to="authorProfilePath"
          class="font-bold truncate moh-text hover:underline underline-offset-2"
          :aria-label="`View @${post.author?.username ?? ''} profile`"
        >
          {{ displayName }}
        </NuxtLink>
        <span v-else class="font-bold truncate moh-text">{{ displayName }}</span>
        <NuxtLink
          v-if="authorProfilePath"
          :to="authorProfilePath"
          class="inline-flex shrink-0 items-center"
          aria-label="View profile (verified badge)"
        >
          <AppVerifiedBadge :status="post.author?.verifiedStatus ?? 'none'" :premium="post.author?.premium ?? false" />
        </NuxtLink>
        <AppVerifiedBadge v-else :status="post.author?.verifiedStatus ?? 'none'" :premium="post.author?.premium ?? false" />
        <NuxtLink
          v-if="authorProfilePath"
          :to="authorProfilePath"
          class="text-sm moh-text-muted truncate hover:underline underline-offset-2"
          :aria-label="`View @${post.author?.username ?? ''} profile`"
        >
          @{{ post.author?.username ?? '—' }}
        </NuxtLink>
        <span v-else class="text-sm moh-text-muted truncate">@{{ post.author?.username ?? '—' }}</span>
        <span class="shrink-0 text-sm moh-text-muted" aria-hidden="true">·</span>
        <NuxtLink
          v-if="post.id"
          :to="postPermalink"
          class="shrink-0 text-sm moh-text-muted whitespace-nowrap hover:underline underline-offset-2"
          :aria-label="`View post`"
        >
          {{ createdAtShort }}
        </NuxtLink>
        <span v-else class="shrink-0 text-sm moh-text-muted whitespace-nowrap">{{ createdAtShort }}</span>
      </div>
      <AppPostRowBody
        :body="post.body"
        :has-media="Boolean(post.media?.length)"
        :mentions="post.mentions"
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
import type { FeedPost } from '~/types/api'

const props = withDefaults(
  defineProps<{
    post: FeedPost
    /** When true, omit the avatar (used when parent renders avatar in shared thread column). */
    contentOnly?: boolean
  }>(),
  { contentOnly: false }
)

const displayName = computed(() => props.post.author?.name || props.post.author?.username || 'User')
const authorProfilePath = computed(() => {
  const u = props.post.author?.username
  return u ? `/u/${encodeURIComponent(u)}` : null
})
const postPermalink = computed(() =>
  props.post?.id ? `/p/${encodeURIComponent(props.post.id)}` : null
)

const createdAtShort = computed(() => {
  const d = new Date(props.post.createdAt)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  const sameYear = now.getFullYear() === d.getFullYear()
  const month = d.toLocaleString(undefined, { month: 'short' })
  const day = d.getDate()
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`
})
</script>
