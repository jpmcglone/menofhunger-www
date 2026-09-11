<template>
  <NuxtLink
    :to="`/a/${article.id}`"
    class="group mt-2 block overflow-hidden rounded-xl border moh-border"
    @click.stop
  >
    <!-- Thumbnail -->
    <div
      v-if="article.thumbnailUrl"
      class="relative aspect-[16/9] w-full overflow-hidden moh-surface-2"
    >
      <img
        :src="article.thumbnailUrl"
        :alt="article.title"
        :class="[
          'h-full w-full object-cover transition-[filter] duration-200 ease-out group-hover:brightness-[1.08]',
          isGated ? 'scale-110 blur-xl' : '',
        ]"
      />
      <div
        v-if="isGated"
        class="absolute inset-0 flex items-center justify-center bg-black/40"
        aria-hidden="true"
      >
        <Icon name="tabler:lock" class="text-3xl text-white drop-shadow-lg" aria-hidden="true" />
      </div>
    </div>

    <!-- Content -->
    <div class="p-3">
      <!-- Article label -->
      <div class="mb-1.5 flex items-center gap-1.5 flex-wrap">
        <Icon name="tabler:article" class="text-[11px] moh-text-soft" aria-hidden="true" />
        <span class="text-[11px] font-medium uppercase tracking-wide moh-text-soft">Article</span>
        <span v-if="readingTime" class="text-[11px] moh-text-soft">· {{ readingTime }}</span>
        <!-- Access gate chip: shown when server stripped the excerpt due to viewer's tier -->
        <span
          v-if="isGated"
          class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[var(--moh-bg)]"
          :class="article.visibility === 'premiumOnly' ? 'bg-[var(--moh-premium)]' : 'bg-[var(--moh-verified)]'"
        >
          <Icon name="tabler:lock" class="text-[10px] shrink-0" aria-hidden="true" />
          {{ gateLabel }}
        </span>
      </div>

      <!-- Title -->
      <p class="line-clamp-2 text-sm font-semibold text-[var(--moh-text)]">
        {{ article.title }}
      </p>

      <!-- Excerpt -->
      <p v-if="article.excerpt" class="mt-1 line-clamp-2 text-xs moh-text-muted">
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
        <span class="truncate text-[11px] moh-text-muted">
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

// Linked article previews fetched from /articles/:id carry the same access flag
// as the full article page. Older/share-post previews fall back to the legacy
// stripped-excerpt signal.
const isGated = computed(() =>
  props.article.viewerCanAccess === false || (!props.article.excerpt && props.article.visibility !== 'public'),
)
const gateLabel = computed(() => {
  if (props.article.visibility === 'premiumOnly') return 'Premium'
  if (props.article.visibility === 'verifiedOnly') return 'Members only'
  return 'Members only'
})
</script>
