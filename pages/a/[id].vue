<template>
  <AppPageContent bottom="standard">
    <AppJoinBanner />
    <!-- Reading progress bar (hidden for gated articles) -->
    <ClientOnly>
      <AppArticleProgressBar v-if="article && article.viewerCanAccess !== false" :visibility="article.visibility" />
    </ClientOnly>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-20 transition-opacity duration-200">
      <AppLogoLoader />
    </div>

    <!-- Not found (404) -->
    <div v-else-if="!article && articleIsNotFound" class="px-4 py-20 text-center">
      <p class="text-lg font-semibold moh-text-muted">Article not found.</p>
      <NuxtLink to="/articles" class="mt-3 inline-block text-sm text-[var(--moh-marv)] hover:underline">Browse articles</NuxtLink>
    </div>

    <!-- Real load failure (network/5xx) — don't claim the article doesn't exist -->
    <div v-else-if="!article" class="px-4 py-20 text-center">
      <p class="text-lg font-semibold moh-text-muted">Couldn't load this article.</p>
      <p class="mt-1 text-sm moh-text-muted">{{ getApiErrorMessage(articleError) || 'Please try again.' }}</p>
      <AppActionButton label="Retry" kind="secondary" class="mt-3" @click="refreshArticle()" />
    </div>

    <!-- Article -->
    <article v-else class="transition-opacity duration-200">
      <!-- Centered content column -->
      <div class="mx-auto max-w-3xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
        <!-- Thumbnail hero -->
        <div v-if="article.thumbnailUrl" class="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl moh-surface-2 border moh-border">
          <img
            :src="article.thumbnailUrl"
            :alt="article.title"
            :class="['h-full w-full object-cover', article.viewerCanAccess === false ? 'blur-xl scale-110' : 'cursor-zoom-in']"
            @click="onThumbnailClick"
          >
          <!-- Lock overlay for gated articles -->
          <div
            v-if="article.viewerCanAccess === false"
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40"
          >
            <Icon name="tabler:lock" class="text-white text-4xl drop-shadow-lg" aria-hidden="true" />
          </div>
        </div>

        <!-- Title -->
        <AppArticlePageHeader :article="article" />

        <AppArticlePageBody :article="article" />

        <!-- Divider -->
        <hr class="my-8 border-[var(--moh-border)]" >

        <AppArticlePageEngagement />

        <AppArticlePageAuthorCard :article="article" />

        <!-- Comments: only shown when the viewer has full access to the article -->
        <div v-if="article.viewerCanAccess !== false" id="comments">
          <AppArticleComments ref="commentsEl" :article-id="article.id" :total-count="displayCommentCount" :visibility="article.visibility" :author="article.author" :highlighted-comment-id="highlightedCommentId" />
        </div>
      </div>

      <!-- Related articles: edge to edge, outside the content column -->
      <ClientOnly>
        <AppArticleRelatedByTagArticles
          v-if="article.tags?.length"
          :article-id="article.id"
          :tags="article.tags"
        />
      </ClientOnly>
      <ClientOnly>
        <AppArticleRelatedArticles
          v-if="article.author.username"
          :author-username="article.author.username"
          :current-article-id="article.id"
        />
      </ClientOnly>
    </article>

    <!-- Share with comment modal -->
    <AppArticlePageShareDialog />
  </AppPageContent>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
import { useArticlePage } from '~/composables/pages/article/useArticlePage'

definePageMeta({ layout: 'app', hideTopBar: true })

const {
  onThumbnailClick,
  article,
  pending,
  articleError,
  refreshArticle,
  articleIsNotFound,
  displayCommentCount,
  highlightedCommentId,
  commentsEl,
} = useArticlePage()

</script>
