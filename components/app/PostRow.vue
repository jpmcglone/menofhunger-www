<template>
  <div class="border-b border-gray-200/60 px-4 py-4 hover:bg-gray-50 dark:border-zinc-800/60 dark:hover:bg-zinc-950/40">
    <div class="flex gap-3">
      <NuxtLink
        v-if="authorProfilePath"
        :to="authorProfilePath"
        class="group h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800"
        :aria-label="`View @${post.author.username} profile`"
      >
        <img
          v-if="authorAvatarUrl"
          :src="authorAvatarUrl"
          alt=""
          class="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
          loading="lazy"
          decoding="async"
        >
        <div v-else class="h-full w-full" aria-hidden="true" />
      </NuxtLink>
      <div v-else class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800" aria-hidden="true" />

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <NuxtLink
            v-if="authorProfilePath"
            :to="authorProfilePath"
            class="font-semibold truncate hover:underline underline-offset-2"
          >
            {{ post.author.name || post.author.username || 'User' }}
          </NuxtLink>
          <span v-else class="font-semibold truncate">
            {{ post.author.name || post.author.username || 'User' }}
          </span>
          <AppVerifiedBadge :status="post.author.verifiedStatus" />
          <span class="text-sm text-gray-500 dark:text-gray-400 truncate">
            @{{ post.author.username || '—' }}
          </span>
          <span
            v-if="visibilityTag"
            class="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border"
            :class="visibilityTagClass"
          >
            {{ visibilityTag }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">·</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ new Date(post.createdAt).toLocaleString() }}
          </span>
        </div>

        <p class="mt-2 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
          {{ post.body }}
        </p>

        <div class="mt-3 flex items-center text-gray-500 dark:text-gray-400">
          <div class="flex items-center gap-6">
            <Button icon="pi pi-comment" text rounded severity="secondary" aria-label="Reply" />
            <Button icon="pi pi-refresh" text rounded severity="secondary" aria-label="Repost" />
            <Button icon="pi pi-heart" text rounded severity="secondary" aria-label="Like" />
          </div>
          <div class="flex-1" />
          <Button icon="pi pi-share-alt" text rounded severity="secondary" aria-label="Share" />
        </div>
      </div>

      <Button icon="pi pi-ellipsis-h" text rounded severity="secondary" aria-label="More" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

const props = defineProps<{
  post: FeedPost
}>()

const post = computed(() => props.post)
const { assetUrl } = useAssets()

const authorProfilePath = computed(() => {
  const username = (post.value.author.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const authorAvatarUrl = computed(() => {
  const base = assetUrl(post.value.author.avatarKey)
  if (!base) return null
  const v = post.value.author.avatarUpdatedAt || ''
  return v ? `${base}?v=${encodeURIComponent(v)}` : base
})

const visibilityTag = computed(() => {
  if (post.value.visibility === 'verifiedOnly') return 'Verified'
  if (post.value.visibility === 'premiumOnly') return 'Premium'
  return null
})

const visibilityTagClass = computed(() => {
  if (post.value.visibility === 'verifiedOnly') {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
  }
  if (post.value.visibility === 'premiumOnly') {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
  }
  return ''
})
</script>

