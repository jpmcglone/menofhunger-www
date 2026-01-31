<template>
  <div class="flex gap-3">
    <div class="shrink-0" aria-hidden="true">
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
        <span class="font-bold truncate moh-text">{{ displayName }}</span>
        <AppVerifiedBadge :status="post.author?.verifiedStatus ?? 'none'" :premium="post.author?.premium ?? false" />
        <span class="text-sm moh-text-muted truncate">@{{ post.author?.username ?? '—' }}</span>
        <span class="shrink-0 text-sm moh-text-muted" aria-hidden="true">·</span>
        <span class="shrink-0 text-sm moh-text-muted whitespace-nowrap">{{ createdAtShort }}</span>
      </div>
      <p class="mt-0.5 whitespace-pre-wrap break-words moh-text text-[15px]">{{ post.body }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

const props = defineProps<{
  post: FeedPost
}>()

const displayName = computed(() => props.post.author?.name || props.post.author?.username || 'User')

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
