<template>
  <!-- Tags -->
  <div v-if="article.tags?.length" class="mt-3 flex flex-wrap gap-1.5">
    <NuxtLink
      v-for="tag in article.tags"
      :key="tag.tag"
      :to="`/topics/${encodeURIComponent(tag.tag)}`"
      class="inline-flex items-center rounded-full border moh-border moh-surface-hover px-2.5 py-0.5 text-xs font-medium moh-text-muted hover:text-[var(--moh-text)] transition-colors"
    >{{ tag.label }}</NuxtLink>
  </div>

  <!-- Visibility badge -->
  <div v-if="article.visibility !== 'public'" class="mt-3">
    <span
      :class="[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        article.visibility === 'premiumOnly'
          ? 'bg-[var(--moh-premium-soft)] text-[var(--moh-premium)]'
          : 'bg-[var(--moh-verified-soft)] text-[var(--moh-verified)]'
      ]"
    >
      {{ article.visibility === 'premiumOnly' ? 'Premium only' : 'Verified only' }}
    </span>
  </div>

  <!-- Table of contents (client-only to avoid DOMParser SSR issues, hidden for gated) -->
  <ClientOnly>
    <AppArticleTableOfContents v-if="article.viewerCanAccess !== false" :html="renderedBody" />
  </ClientOnly>

  <!-- Body (rendered Tiptap HTML) — only for accessible articles -->
  <div
    v-if="article.viewerCanAccess !== false"
    class="prose prose-gray mt-8 dark:prose-invert max-w-none article-body"
    @click="onArticleBodyClick"
    v-html="bodyWithHeadingIds"
  />

  <!-- Gated: show faded excerpt teaser then access gate -->
  <template v-else>
    <div
      v-if="article.excerpt"
      class="relative overflow-hidden mt-8"
      style="opacity: 0.75; mask-image: linear-gradient(to bottom, black 30%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 30%, transparent 100%);"
    >
      <p class="text-base leading-relaxed text-[var(--moh-text)]">
        {{ article.excerpt }}
      </p>
    </div>

    <!-- Access gate card -->
    <div
      class="mt-6 flex flex-col items-center gap-4 rounded-2xl border moh-border moh-surface-2 px-6 py-10 text-center"
    >
    <div
      class="flex h-14 w-14 items-center justify-center rounded-full"
      :class="article.visibility === 'premiumOnly'
        ? 'bg-[var(--moh-premium-soft)]'
        : 'bg-[var(--moh-verified-soft)]'"
    >
      <Icon
        name="tabler:lock"
        class="text-2xl"
        :class="article.visibility === 'premiumOnly' ? 'text-[var(--moh-premium)]' : 'text-[var(--moh-verified)]'"
        aria-hidden="true"
      />
    </div>
    <div>
      <p class="text-lg font-bold text-[var(--moh-text)]">
        {{ article.visibility === 'premiumOnly' ? 'Premium members only' : 'Verified members only' }}
      </p>
      <p class="mt-1 text-sm moh-text-muted">
        {{ article.visibility === 'premiumOnly'
          ? 'This article is exclusively for premium members. Upgrade to read the full article.'
          : 'This article is for verified members. Get verified to read the full article.' }}
      </p>
    </div>
    <NuxtLink
      :to="article.visibility === 'premiumOnly' ? '/tiers' : '/settings/verification'"
      :class="[
        'mt-2 inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90',
        article.visibility === 'premiumOnly' ? 'bg-[var(--moh-premium)]' : 'bg-[var(--moh-verified)]',
      ]"
    >
      <Icon name="tabler:arrow-right" aria-hidden="true" />
      {{ article.visibility === 'premiumOnly' ? 'See plans' : 'Get verified' }}
    </NuxtLink>
  </div>
  </template>

  <!-- View sentinel: placed immediately after the article body.
       The IntersectionObserver fires when the reader scrolls past the
       end of the article content (≈ read the whole thing).
       Not rendered for gated articles so no view is ever tracked. -->
  <div v-if="article.viewerCanAccess !== false" ref="viewSentinelEl" aria-hidden="true" />
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'
import { useArticlePageContext } from '~/composables/pages/article/useArticlePage'

defineProps<{ article: Article }>()

const {
  renderedBody,
  onArticleBodyClick,
  bodyWithHeadingIds,
  viewSentinelEl,
} = useArticlePageContext()
</script>

<style scoped>
.article-body :deep(img) {
  cursor: zoom-in;
}
</style>
