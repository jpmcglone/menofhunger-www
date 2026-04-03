<template>
  <NuxtLink
    :to="`/a/${article.id}`"
    class="group mt-2 block overflow-hidden rounded-xl border border-gray-200 transition-colors hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600"
    @click.stop
  >
    <!-- Thumbnail -->
    <div v-if="article.thumbnailUrl" class="aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
      <img
        :src="article.thumbnailUrl"
        :alt="article.title"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>

    <!-- Content -->
    <div class="p-3">
      <!-- Article label -->
      <div class="mb-1.5 flex items-center gap-1.5 flex-wrap">
        <Icon name="tabler:article" class="text-[11px] text-gray-400 dark:text-zinc-500" aria-hidden="true" />
        <span class="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500">Article</span>
        <span v-if="readingTime" class="text-[11px] text-gray-400 dark:text-zinc-500">· {{ readingTime }}</span>
        <!-- Access gate chip: shown when server stripped the excerpt due to viewer's tier -->
        <span
          v-if="isGated"
          class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50"
        >
          <Icon name="tabler:lock" class="text-[10px] shrink-0" aria-hidden="true" />
          {{ gateLabel }}
        </span>
      </div>

      <!-- Title -->
      <p class="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ article.title }}
      </p>

      <!-- Excerpt -->
      <p v-if="article.excerpt" class="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-zinc-400">
        {{ article.excerpt }}
      </p>

      <!-- Author -->
      <div class="mt-2 flex items-center gap-1.5">
        <AppUserAvatar
          v-if="article.author"
          :user="article.author"
          size="xs"
          class="flex-shrink-0"
        />
        <span class="truncate text-[11px] text-gray-500 dark:text-zinc-400">
          {{ article.author?.name || article.author?.username || 'Unknown' }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { ArticleSharePreview } from '~/types/api'

const props = defineProps<{
  article: ArticleSharePreview
}>()

const readingTime = computed(() => {
  if (!props.article.excerpt) return null
  const words = props.article.excerpt.split(/\s+/).length
  const minutes = Math.max(1, Math.round(words / 200))
  return `${minutes} min read`
})

// The excerpt is stripped server-side when the viewer's tier doesn't permit access.
const isGated = computed(() => !props.article.excerpt && props.article.visibility !== 'public')
const gateLabel = computed(() => {
  if (props.article.visibility === 'premiumOnly') return 'Premium'
  if (props.article.visibility === 'verifiedOnly') return 'Members only'
  return 'Members only'
})
</script>
