<template>
  <!-- Engagement bar — same style as PostRow -->
  <div class="flex items-center justify-between moh-text-muted">
    <div class="flex items-center gap-1">
      <!-- Comments -->
      <div class="inline-flex w-14 items-center justify-start">
        <button
          type="button"
          class="moh-tap inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors moh-surface-hover"
          aria-label="Jump to replies"
          @click="guardedScrollToComments"
        >
          <Icon name="tabler:message-circle" class="text-[18px]" aria-hidden="true" />
        </button>
        <span class="ml-0 inline-block min-w-[1.5rem] select-none text-left text-[11px] sm:text-xs tabular-nums moh-text-muted">
          {{ displayCommentCount || '' }}
        </span>
      </div>

      <!-- Boost -->
      <div class="inline-flex w-14 items-center justify-start">
        <button
          type="button"
          class="moh-tap inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors moh-surface-hover"
          :aria-label="isHydrated && boostState.boosted.value ? 'Remove boost' : 'Boost article'"
          @click="guardedBoost"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
            aria-hidden="true"
            :style="isHydrated && boostState.boosted.value ? { color: 'var(--p-primary-color)' } : undefined"
          >
            <path
              d="M12 4.5L3.75 12.25h5.25V20h6V12.25h5.25L12 4.5z"
              :fill="isHydrated && boostState.boosted.value ? 'currentColor' : 'none'"
              :stroke="isHydrated && boostState.boosted.value ? undefined : 'currentColor'"
              stroke-width="1.9"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <span class="ml-0 inline-block w-6 select-none text-left text-[11px] sm:text-xs moh-text-muted">
          <AppAnimatedCount :value="articleBoostCount" :format="formatShortCount" blank-zero />
        </span>
      </div>

      <!-- Reactions: ClientOnly because reaction state (viewerHasReacted, count)
           differs between unauthenticated SSR and authenticated client -->
      <ClientOnly>
        <AppArticleReactionBar
          :reactions="reactionState.reactions.value"
          :readonly="!isAuthed || article?.viewerCanAccess === false"
          @toggle="guardedReact"
        />
      </ClientOnly>

    </div>

    <!-- View count + Share menu -->
    <div class="flex items-center gap-2">
      <AppPostRowViewerBreakdown
        v-if="displayViewCount > 0 && article?.id"
        :entity-id="article.id"
        :breakdown-path="`/articles/${encodeURIComponent(article.id)}/views/breakdown?fresh=1`"
        :viewer-count="displayViewCount"
        :total-view-count="displayTotalViewCount"
        :has-viewed="hasViewedArticle"
        people-verb="read this"
        @count-synced="onArticleViewSynced"
      />

      <button
        type="button"
        class="moh-tap inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors moh-surface-hover"
      aria-label="Article actions"
      @click="toggleShareMenu($event)"
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
        <path d="M12 3v10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
        <path d="M7.5 7.5L12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      </button>
      <AppReportDialog v-if="article" v-model:visible="showArticleReport" target-type="article" :subject-article-id="article.id" />
      <Menu v-if="shareMenuMounted" ref="shareMenuRef" :model="shareMenuItems" popup>
        <template #item="{ item, props: itemProps }">
          <a v-bind="itemProps.action" class="flex items-center gap-2">
            <Icon v-if="item.iconName" :name="item.iconName" aria-hidden="true" />
            <span v-bind="itemProps.label">{{ item.label }}</span>
          </a>
        </template>
      </Menu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatShortCount } from '~/utils/text'
import Menu from 'primevue/menu'
import { useArticlePageContext } from '~/composables/pages/article/useArticlePage'

const {
  guardedScrollToComments,
  displayCommentCount,
  isHydrated,
  boostState,
  guardedBoost,
  articleBoostCount,
  reactionState,
  isAuthed,
  article,
  guardedReact,
  displayViewCount,
  displayTotalViewCount,
  hasViewedArticle,
  onArticleViewSynced,
  toggleShareMenu,
  showArticleReport,
  shareMenuMounted,
  shareMenuItems,
  shareMenuRef,
} = useArticlePageContext()
</script>

