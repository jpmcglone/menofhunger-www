<template>
  <div class="flex items-start justify-between gap-4">
    <h1 class="text-3xl font-bold leading-snug text-[var(--moh-text)] sm:text-4xl">
      {{ article.title }}
    </h1>
    <div v-if="viewerIsAuthor" class="mt-1.5 flex flex-shrink-0 items-center gap-2">
      <NuxtLink
        :to="`/articles/edit/${article.id}`"
        class="inline-flex items-center gap-1.5 rounded-full border moh-border px-3 py-1 text-xs font-medium moh-text-muted hover:border-[var(--moh-text-muted)] hover:text-[var(--moh-text)] transition-colors"
      >
        <AppIconGlyph name="write" :size="16" />
        Edit
      </NuxtLink>
      <button
        type="button"
        class="inline-flex items-center rounded-full border border-red-500/60 px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
        @click="confirmingArticleDelete = true"
      >
        Delete
      </button>
    </div>
  </div>

  <div
    v-if="viewerIsAuthor && confirmingArticleDelete"
    class="mt-3 flex items-center gap-3 rounded-xl bg-[var(--moh-surface-hover)] px-3 py-2"
    role="alertdialog"
    aria-label="Delete this article?"
  >
    <span class="flex-1 text-sm text-[var(--moh-text)]">Delete this article? This cannot be undone.</span>
    <button
      type="button"
      class="rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      :disabled="deletingArticle"
      @click="deleteArticle"
    >
      {{ deletingArticle ? 'Deleting…' : 'Delete' }}
    </button>
    <button type="button" class="text-xs font-medium moh-text-muted" :disabled="deletingArticle" @click="confirmingArticleDelete = false">Cancel</button>
  </div>

  <div
    v-if="viewerIsAuthor && article.pickaxError"
    class="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2"
  >
    <img src="/images/brands/pickax.png" alt="" width="16" height="16" class="mt-0.5 h-4 w-4 rounded-[3px]">
    <p class="min-w-0 flex-1 text-xs moh-text">
      Pickax did not take this article: {{ article.pickaxError }}
      <NuxtLink to="/settings/integrations" class="font-semibold underline underline-offset-2">Check your connection</NuxtLink>
    </p>
  </div>

  <div
    v-if="viewerIsAuthor && article.xError"
    class="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2"
  >
    <Icon name="tabler:brand-x" class="mt-0.5 h-4 w-4 shrink-0" />
    <p class="min-w-0 flex-1 text-xs moh-text">
      X did not take this article: {{ article.xError }}
      <NuxtLink to="/settings/integrations" class="font-semibold underline underline-offset-2">Check your connection</NuxtLink>
    </p>
  </div>

  <!-- Meta: author, date, read time -->
  <div class="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm moh-text-muted">
    <span>by</span>
    <NuxtLink
      :to="`/u/${article.author.username}`"
      class="font-medium text-[var(--moh-text)] hover:underline underline-offset-2"
      @mouseenter="(e) => authorEnter(e)"
      @mousemove="(e) => authorMove(e)"
      @mouseleave="authorLeave"
    >{{ article.author.name || article.author.username }}</NuxtLink>
    <span class="mx-1">·</span>
    <time :datetime="article.publishedAt ?? article.createdAt">{{ publishedLabel }}</time>
    <span v-if="readingTime && article.viewerCanAccess !== false">· {{ readingTime }}</span>
    <time v-if="article.editedAt" :datetime="article.editedAt" class="text-xs moh-text-soft">· Edited {{ editedLabel }}</time>
    <span
      v-if="crosspostWaiting.pickax && !article.pickaxUrl && !article.pickaxError"
      class="inline-flex h-3.5 w-3.5 motion-safe:animate-pulse rounded-[3px] bg-[var(--moh-text-muted)] opacity-40"
      role="status"
      aria-label="Sharing to Pickax"
    />
    <a
      v-if="article.pickaxUrl"
      v-tooltip.bottom="tinyTooltip('Shared on Pickax')"
      :href="article.pickaxUrl"
      target="_blank"
      rel="noopener nofollow"
      class="inline-flex items-center gap-1 text-xs moh-text-muted hover:text-[var(--moh-text)]"
      aria-label="Shared on Pickax"
    >
      <span aria-hidden="true">·</span>
      <img
        src="/images/brands/pickax.png"
        alt=""
        width="14"
        height="14"
        class="h-3.5 w-3.5 rounded-[3px] opacity-70"
      >
      On Pickax
    </a>
    <span
      v-if="crosspostWaiting.x && !article.xUrl && !article.xError"
      class="inline-flex h-3.5 w-3.5 motion-safe:animate-pulse rounded-full bg-[var(--moh-text-muted)] opacity-40"
      role="status"
      aria-label="Sharing to X"
    />
    <a
      v-if="article.xUrl"
      v-tooltip.bottom="tinyTooltip('Shared on X')"
      :href="article.xUrl"
      target="_blank"
      rel="noopener nofollow"
      class="inline-flex items-center gap-1 text-xs moh-text-muted hover:text-[var(--moh-text)]"
      aria-label="Shared on X"
    >
      <span aria-hidden="true">·</span>
      <Icon name="tabler:brand-x" class="h-3.5 w-3.5 opacity-70" />
      On X
    </a>
    <button
      v-if="article.viewerCanAccess !== false && displayCommentCount > 0"
      type="button"
      class="hover:underline underline-offset-2"
      @click="guardedScrollToComments"
    >· {{ displayCommentCount }} {{ displayCommentCount === 1 ? 'reply' : 'replies' }}</button>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'
import { useArticlePageContext } from '~/composables/pages/article/useArticlePage'

defineProps<{ article: Article }>()

const {
  viewerIsAuthor,
  confirmingArticleDelete,
  deletingArticle,
  deleteArticle,
  authorEnter,
  authorMove,
  authorLeave,
  publishedLabel,
  readingTime,
  editedLabel,
  crosspostWaiting,
  displayCommentCount,
  guardedScrollToComments,
} = useArticlePageContext()
</script>

